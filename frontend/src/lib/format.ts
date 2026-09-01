/** Display formatting. Every numeric string here is meant for tabular columns. */

const EM_DASH = "—";

function fixed(value: number, digits: number): string {
  // Thousands grouping, matched to the "M"/"k" units used by the KPI headlines.
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Energy figures: whole kWh, grouped. */
export function formatKwh(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return fixed(value, 0);
}

/** Signed energy delta — the sign is part of the reading. */
export function formatDeltaKwh(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${fixed(Math.abs(value), 0)}`;
}

/** Production volumes in KL, one decimal. */
export function formatKl(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return fixed(value, 1);
}

export function formatDeltaKl(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${fixed(Math.abs(value), 1)}`;
}

/**
 * Signed percentage. `null` means the baseline was zero — rendered as an em
 * dash rather than an error or an Infinity.
 */
export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${fixed(Math.abs(value), 1)}%`;
}

/** Unsigned percentage, for load ratios. */
export function formatPlainPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return `${fixed(value, 1)}%`;
}

/** Power and SPC ratios carry two decimals. */
export function formatKw(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return fixed(value, 2);
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return fixed(value, 1);
}

export function formatDeltaHours(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${fixed(Math.abs(value), 1)}`;
}

/** SPC, kWh/KL. Non-producing blocks come through as `null`. */
export function formatSpc(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return fixed(value, 2);
}

/** Large KPI headline numbers get a compact unit suffix. */
export function formatCompactKwh(value: number): string {
  if (!Number.isFinite(value)) return EM_DASH;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${fixed(value / 1_000_000, 2)}M`;
  if (abs >= 100_000) return `${fixed(value / 1_000, 1)}k`;
  return fixed(value, 0);
}

/** `2026-08-29` → `29 Aug 2026`. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

export function formatRange(start: string, end: string): string {
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

export { EM_DASH };
