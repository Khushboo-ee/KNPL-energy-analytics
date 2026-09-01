import { dayIndex, eachDay } from "@/lib/periods";
import type { Equipment, EnergyNode, Period, PeriodPair } from "@/lib/types";
import { PLANT, type DriftSpec, type EquipmentSpec, type NodeSpec } from "./plant-model";

/**
 * Period readings for the plant hierarchy.
 *
 * This is the single seam between the dashboard and its data. It resolves a
 * `PeriodPair` into a fully populated `EnergyNode` tree; a live IOsense
 * implementation would keep the same signature and fetch device/enms series
 * instead of synthesising them.
 *
 * Readings are derived per machine per calendar day from a deterministic hash
 * of (machine id, day), so the same window always returns the same figures —
 * no random reshuffling between renders, and server and client agree.
 *
 * Roll-up rule: a parent's energy and production are the sums of its children,
 * and a deepest level's energy is the sum of its machines. Every aggregate in
 * the tree is therefore reconcilable against the leaves below it.
 */

const HOURS_PER_DAY = 24;

/** FNV-1a over the key, avalanche-mixed, normalised to [0, 1). */
function noise(key: string, day: number, channel: number): number {
  let h = 2166136261 ^ (day * 374761393) ^ (channel * 668265263);
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Smoothly-varying noise: random values anchored every `periodDays` and
 * smoothstep-interpolated between them.
 *
 * Independent per-day noise would be the wrong model here. Real plants run to
 * campaigns and schedules that hold for days at a time, and a metric like
 * marginal kW divides by the *difference* in run hours between two windows —
 * with IID daily noise that difference averages towards zero over a month and
 * the ratio blows up. Correlating the variation over a week keeps window totals
 * separated by plausible amounts.
 */
function smoothNoise(key: string, day: number, channel: number, periodDays: number): number {
  const t = day / periodDays;
  const anchor = Math.floor(t);
  const frac = t - anchor;
  const from = noise(key, anchor, channel);
  const to = noise(key, anchor + 1, channel);
  const weight = frac * frac * (3 - 2 * frac);
  return from + (to - from) * weight;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Sunday, given day 0 of the epoch was a Thursday. */
function isSunday(day: number): boolean {
  return (day + 4) % 7 === 0;
}

/**
 * How far a drift regime has progressed on a given day: 0 before it started,
 * ramping linearly to 1 over `rampDays`.
 */
function driftProgress(drift: DriftSpec | undefined, day: number, anchorDay: number): number {
  if (!drift) return 0;
  const startDay = anchorDay - drift.startDaysAgo;
  if (day <= startDay) return 0;
  return clamp((day - startDay) / drift.rampDays, 0, 1);
}

interface DailyReading {
  kwh: number;
  runHrs: number;
}

function readMachineDay(spec: EquipmentSpec, day: number, anchorDay: number): DailyReading {
  const dayShape = isSunday(day) ? spec.weekendFactor : 1;
  const progress = driftProgress(spec.drift, day, anchorDay);

  // Running time is the variable a plant actually schedules, so it carries the
  // week-to-week variation. Load factor is a property of the machine and stays
  // near its rating band unless something is drifting — which is what makes
  // marginal kW (ΔkWh per extra hour) settle near the machine's true operating
  // draw for healthy assets, and break out of it for faulty ones.
  const hoursJitter =
    (0.88 + 0.24 * smoothNoise(spec.id, day, 1, 7)) *
    (0.985 + 0.03 * noise(spec.id, day, 4));
  const loadJitter =
    (0.975 + 0.05 * smoothNoise(spec.id, day, 2, 10)) *
    (0.995 + 0.01 * noise(spec.id, day, 5));

  const runHrs = clamp(
    spec.dutyHrs * dayShape * hoursJitter * (1 + (spec.drift?.runDrift ?? 0) * progress),
    0,
    HOURS_PER_DAY,
  );
  const loadFactor = clamp(
    spec.loadFactor * loadJitter * (1 + (spec.drift?.loadDrift ?? 0) * progress),
    0.05,
    1.4,
  );

  return { kwh: runHrs * spec.rated_kw * loadFactor, runHrs };
}

function readMachine(spec: EquipmentSpec, period: Period, anchorDay: number): DailyReading {
  return eachDay(period).reduce<DailyReading>(
    (total, day) => {
      const reading = readMachineDay(spec, day, anchorDay);
      return { kwh: total.kwh + reading.kwh, runHrs: total.runHrs + reading.runHrs };
    },
    { kwh: 0, runHrs: 0 },
  );
}

/**
 * Booked output for a producing block. Non-producing blocks are authored at 0
 * and stay at 0 — the divide-by-zero guards downstream depend on it.
 */
function readProduction(spec: NodeSpec, period: Period, anchorDay: number): number {
  const perDay = spec.productionKlPerDay ?? 0;
  if (perDay === 0) return 0;

  // For production the drift magnitude is carried on `loadDrift`.
  const magnitude = spec.productionDrift?.loadDrift ?? spec.productionDrift?.runDrift ?? 0;

  return eachDay(period).reduce((total, day) => {
    const dayShape = isSunday(day) ? 0.25 : 1;
    const jitter =
      (0.9 + 0.2 * smoothNoise(`${spec.id}:prod`, day, 3, 7)) *
      (0.97 + 0.06 * noise(`${spec.id}:prod`, day, 6));
    const progress = driftProgress(spec.productionDrift, day, anchorDay);
    return total + perDay * dayShape * jitter * (1 + magnitude * progress);
  }, 0);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildEquipment(
  specs: readonly EquipmentSpec[],
  periods: PeriodPair,
  anchorDay: number,
): Equipment[] {
  return specs.map((spec) => {
    const current = readMachine(spec, periods.current, anchorDay);
    const previous = readMachine(spec, periods.previous, anchorDay);
    return {
      id: spec.id,
      name: spec.name,
      rated_kw: spec.rated_kw,
      current_kwh: round(current.kwh),
      previous_kwh: round(previous.kwh),
      current_run_hrs: round(current.runHrs),
      previous_run_hrs: round(previous.runHrs),
    };
  });
}

function buildNode(
  spec: NodeSpec,
  periods: PeriodPair,
  anchorDay: number,
  depth: number,
): EnergyNode {
  if (spec.children?.length) {
    const children = spec.children.map((child) =>
      buildNode(child, periods, anchorDay, depth + 1),
    );
    return {
      id: spec.id,
      name: spec.name,
      depth,
      current_kwh: round(children.reduce((s, c) => s + c.current_kwh, 0)),
      previous_kwh: round(children.reduce((s, c) => s + c.previous_kwh, 0)),
      current_production: round(children.reduce((s, c) => s + c.current_production, 0)),
      previous_production: round(children.reduce((s, c) => s + c.previous_production, 0)),
      children,
    };
  }

  const equipment = buildEquipment(spec.equipment ?? [], periods, anchorDay);
  return {
    id: spec.id,
    name: spec.name,
    depth,
    current_kwh: round(equipment.reduce((s, e) => s + e.current_kwh, 0)),
    previous_kwh: round(equipment.reduce((s, e) => s + e.previous_kwh, 0)),
    current_production: round(readProduction(spec, periods.current, anchorDay)),
    previous_production: round(readProduction(spec, periods.previous, anchorDay)),
    equipment,
  };
}

/**
 * Builds the plant tree for a comparison window.
 *
 * @param periods  current and previous windows, inclusive ISO dates
 * @param today    the reference "now", so drift regimes are dated relative to
 *                 a value the server and client both hold
 */
export function loadPlantTree(periods: PeriodPair, today: string): EnergyNode {
  return buildNode(PLANT, periods, dayIndex(today), 0);
}
