import type { DurationSelection, Period, PresetId } from "./types";

/**
 * Date arithmetic for the duration selector.
 *
 * All windows are inclusive `yyyy-mm-dd` strings handled in UTC so the same
 * range resolves identically on the server and in the browser. Comparison
 * windows are always length-matched: "This Month" is month-to-date against the
 * *same number of days* of last month, not a full month, so a partial current
 * period never reads as a spurious drop.
 */

const MS_PER_DAY = 86_400_000;

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Days since the Unix epoch — the canonical integer form of a calendar date. */
export function dayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayIndex(index: number): string {
  return new Date(index * MS_PER_DAY).toISOString().slice(0, 10);
}

export function shiftDays(iso: string, days: number): string {
  return fromDayIndex(dayIndex(iso) + days);
}

/** Inclusive day count of a window; at least 1. */
export function lengthInDays(period: Period): number {
  return Math.max(1, dayIndex(period.end) - dayIndex(period.start) + 1);
}

export function eachDay(period: Period): number[] {
  const start = dayIndex(period.start);
  const end = dayIndex(period.end);
  const days: number[] = [];
  for (let d = start; d <= end; d += 1) days.push(d);
  return days;
}

/** Normalises a user-entered window so `start` never sits after `end`. */
export function orderPeriod(period: Period): Period {
  return dayIndex(period.start) <= dayIndex(period.end)
    ? period
    : { start: period.end, end: period.start };
}

function startOfWeek(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const sinceMonday = (weekday + 6) % 7;
  return shiftDays(iso, -sinceMonday);
}

function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function startOfPreviousMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return m === 1
    ? `${y - 1}-12-01`
    : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

function lastDayOfMonth(isoFirstOfMonth: string): string {
  const [y, m] = isoFirstOfMonth.split("-").map(Number);
  const firstOfNext =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return shiftDays(firstOfNext, -1);
}

/**
 * The window of the same length ending the day before `period` starts. Used
 * for the day and week presets, where "previous" means the adjacent window.
 */
export function precedingWindow(period: Period): Period {
  const span = lengthInDays(period);
  const end = shiftDays(period.start, -1);
  return { start: shiftDays(end, -(span - 1)), end };
}

export const PRESETS: { id: Exclude<PresetId, "custom">; label: string }[] = [
  { id: "today", label: "Today vs Yesterday" },
  { id: "week", label: "This Week vs Last Week" },
  { id: "month", label: "This Month vs Last Month" },
];

export const PRESET_LABELS: Record<PresetId, string> = {
  today: "Today vs Yesterday",
  week: "This Week vs Last Week",
  month: "This Month vs Last Month",
  custom: "Custom Range",
};

/**
 * Resolves a preset into the concrete pair of windows, relative to `today`.
 */
export function resolvePreset(
  preset: Exclude<PresetId, "custom">,
  today: string,
): DurationSelection {
  const label = PRESET_LABELS[preset];

  if (preset === "today") {
    const current = { start: today, end: today };
    return { preset, label, current, previous: precedingWindow(current) };
  }

  if (preset === "week") {
    const current = { start: startOfWeek(today), end: today };
    const span = lengthInDays(current);
    const previousStart = shiftDays(current.start, -7);
    return {
      preset,
      label,
      current,
      previous: {
        start: previousStart,
        end: shiftDays(previousStart, span - 1),
      },
    };
  }

  // Month-to-date against the same number of days of the previous month,
  // clamped so a 31-day MTD never overruns a 28-day February.
  const current = { start: startOfMonth(today), end: today };
  const span = lengthInDays(current);
  const previousStart = startOfPreviousMonth(today);
  const previousMonthEnd = lastDayOfMonth(previousStart);
  const naturalEnd = shiftDays(previousStart, span - 1);
  const previousEnd =
    dayIndex(naturalEnd) > dayIndex(previousMonthEnd)
      ? previousMonthEnd
      : naturalEnd;

  return {
    preset,
    label,
    current,
    previous: { start: previousStart, end: previousEnd },
  };
}

export function buildCustom(current: Period, previous: Period): DurationSelection {
  return {
    preset: "custom",
    label: PRESET_LABELS.custom,
    current: orderPeriod(current),
    previous: orderPeriod(previous),
  };
}
