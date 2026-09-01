import type { Equipment, EnergyNode, LoadStatus } from "./types";

/**
 * Every derived figure in the dashboard comes from this module. Nothing is
 * precomputed in the data layer and nothing is hardcoded in a component, so
 * a formula change lands everywhere at once.
 */

/** Percentage change against a baseline. `null` when the baseline is zero. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/* ---------------------------------- nodes --------------------------------- */

export function deltaKwh(node: EnergyNode | Equipment): number {
  return node.current_kwh - node.previous_kwh;
}

export function deltaPctKwh(node: EnergyNode | Equipment): number | null {
  return deltaPct(node.current_kwh, node.previous_kwh);
}

export function deltaProduction(node: EnergyNode): number {
  return node.current_production - node.previous_production;
}

export function deltaPctProduction(node: EnergyNode): number | null {
  return deltaPct(node.current_production, node.previous_production);
}

/**
 * Specific power consumption, kWh per KL. `null` for non-producing blocks
 * (R&D, RM, Utility) so the UI can render an em dash instead of Infinity.
 */
export function spc(kwh: number, production: number): number | null {
  if (production === 0) return null;
  return kwh / production;
}

export function currentSpc(node: EnergyNode): number | null {
  return spc(node.current_kwh, node.current_production);
}

export function previousSpc(node: EnergyNode): number | null {
  return spc(node.previous_kwh, node.previous_production);
}

/* -------------------------------- equipment ------------------------------- */

export function deltaRunHrs(item: Equipment): number {
  return item.current_run_hrs - item.previous_run_hrs;
}

/**
 * Energy added per extra hour of running — the marginal draw of the machine.
 * `null` when run hours did not move, because the ratio is undefined.
 */
export function marginalKw(item: Equipment): number | null {
  const hrs = deltaRunHrs(item);
  if (hrs === 0) return null;
  return deltaKwh(item) / hrs;
}

/** Marginal draw as a share of nameplate rating. */
export function marginalLoadPct(item: Equipment): number | null {
  const kw = marginalKw(item);
  if (kw === null || item.rated_kw === 0) return null;
  return (kw / item.rated_kw) * 100;
}

export const IDLE_HEAVY_BELOW_PCT = 40;
export const OVERLOAD_ABOVE_PCT = 105;

/**
 * Below 40% of rating the extra hours were mostly idling; above 105% the
 * machine is drawing beyond nameplate. Both are faults worth flagging red.
 */
export function loadStatus(pct: number | null): LoadStatus {
  if (pct === null || !Number.isFinite(pct)) return "unknown";
  if (pct < IDLE_HEAVY_BELOW_PCT) return "idle-heavy";
  if (pct > OVERLOAD_ABOVE_PCT) return "overload";
  return "normal";
}

export function equipmentLoadStatus(item: Equipment): LoadStatus {
  return loadStatus(marginalLoadPct(item));
}

/* --------------------------------- ranking -------------------------------- */

/**
 * Biggest mover first. This ordering is the core "trace the increase"
 * affordance: expanding always leads down the dominant branch.
 */
export function byAbsDeltaKwhDesc<T extends EnergyNode | Equipment>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => {
    const diff = Math.abs(deltaKwh(b)) - Math.abs(deltaKwh(a));
    // Stable tie-break so re-renders never reshuffle equal rows.
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

/**
 * The section with the single largest positive Δ kWh — the headline answer to
 * "who caused the plant increase". `null` when no child increased.
 */
export function topContributor(node: EnergyNode): EnergyNode | null {
  const risers = (node.children ?? []).filter((child) => deltaKwh(child) > 0);
  if (risers.length === 0) return null;
  return risers.reduce((best, child) =>
    deltaKwh(child) > deltaKwh(best) ? child : best,
  );
}

/** A contributor's share of the total increase across all rising siblings. */
export function shareOfIncrease(
  child: EnergyNode,
  parent: EnergyNode,
): number | null {
  const totalRise = (parent.children ?? []).reduce(
    (sum, c) => sum + Math.max(0, deltaKwh(c)),
    0,
  );
  if (totalRise === 0) return null;
  return (Math.max(0, deltaKwh(child)) / totalRise) * 100;
}
