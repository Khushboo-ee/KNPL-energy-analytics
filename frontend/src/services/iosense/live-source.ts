import { dayIndex } from "@/lib/periods";
import type { Equipment, EnergyNode, PeriodPair } from "@/lib/types";
import { PLANT, type NodeSpec } from "../plant-model";
import { isClusterBinding, type Binding, type PlantBindings } from "./bindings";
import {
  fetchChannelTotals,
  type ChannelRequest,
  type ChannelTotals,
  type WindowPair,
} from "./widget-data";

/**
 * Builds the plant tree from live IOsense telemetry.
 *
 * Mirrors `energy-source.ts` exactly — same roll-up rule, same output type —
 * so every downstream component, formula and export is unchanged. The only
 * difference is where the leaf numbers come from.
 */

const MS_PER_DAY = 86_400_000;

/** Window boundaries as epoch ms: start of the first day, end of the last. */
function toWindows(periods: PeriodPair): WindowPair {
  return {
    currentStartMs: dayIndex(periods.current.start) * MS_PER_DAY,
    currentEndMs: (dayIndex(periods.current.end) + 1) * MS_PER_DAY - 1,
    previousStartMs: dayIndex(periods.previous.start) * MS_PER_DAY,
    previousEndMs: (dayIndex(periods.previous.end) + 1) * MS_PER_DAY - 1,
  };
}

function toSource(binding: Binding): ChannelRequest["source"] {
  return isClusterBinding(binding)
    ? { type: "cluster", clusterID: binding.clusterID }
    : { type: "device", devID: binding.devID, sensor: binding.sensor };
}

function request(id: string, binding: Binding): ChannelRequest {
  return { id, source: toSource(binding), operator: binding.operator ?? "sum" };
}

/** Walks the model and collects every channel the tree needs. */
function collectChannels(
  spec: NodeSpec,
  bindings: PlantBindings,
  out: ChannelRequest[],
): void {
  const nodeBinding = bindings.nodes[spec.id];
  if (nodeBinding?.energyKwh) {
    out.push(request(`node:${spec.id}:kwh`, nodeBinding.energyKwh));
  }
  if (nodeBinding?.productionKl) {
    out.push(request(`node:${spec.id}:production`, nodeBinding.productionKl));
  }

  for (const item of spec.equipment ?? []) {
    const bound = bindings.equipment[item.id];
    if (!bound) continue;
    out.push(request(`eq:${item.id}:kwh`, bound.energyKwh));
    if (bound.runHours) {
      out.push(request(`eq:${item.id}:hrs`, bound.runHours));
    }
  }

  for (const child of spec.children ?? []) {
    collectChannels(child, bindings, out);
  }
}

/**
 * A missing reading is 0 for summation purposes, but the distinction matters:
 * `null` means the connector returned nothing for that channel, which the
 * diagnostics report separately from a genuine zero.
 */
function value(totals: ChannelTotals | undefined, side: "current" | "previous"): number {
  return totals?.[side] ?? 0;
}

function round(n: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function buildEquipment(
  spec: NodeSpec,
  bindings: PlantBindings,
  totals: Map<string, ChannelTotals>,
): Equipment[] {
  return (spec.equipment ?? []).map((item) => {
    const kwh = totals.get(`eq:${item.id}:kwh`);
    const hrs = totals.get(`eq:${item.id}:hrs`);
    return {
      id: item.id,
      name: item.name,
      rated_kw: item.rated_kw,
      current_kwh: round(value(kwh, "current")),
      previous_kwh: round(value(kwh, "previous")),
      current_run_hrs: round(value(hrs, "current")),
      previous_run_hrs: round(value(hrs, "previous")),
    };
  });
}

function buildNode(
  spec: NodeSpec,
  bindings: PlantBindings,
  totals: Map<string, ChannelTotals>,
  depth: number,
): EnergyNode {
  const meter = totals.get(`node:${spec.id}:kwh`);
  const production = totals.get(`node:${spec.id}:production`);

  if (spec.children?.length) {
    const children = spec.children.map((child) =>
      buildNode(child, bindings, totals, depth + 1),
    );
    return {
      id: spec.id,
      name: spec.name,
      depth,
      // A zone meter is authoritative: it also captures losses and small
      // unmetered loads that summing the named children would miss.
      current_kwh: meter
        ? round(value(meter, "current"))
        : round(children.reduce((s, c) => s + c.current_kwh, 0)),
      previous_kwh: meter
        ? round(value(meter, "previous"))
        : round(children.reduce((s, c) => s + c.previous_kwh, 0)),
      current_production: production
        ? round(value(production, "current"))
        : round(children.reduce((s, c) => s + c.current_production, 0)),
      previous_production: production
        ? round(value(production, "previous"))
        : round(children.reduce((s, c) => s + c.previous_production, 0)),
      children,
    };
  }

  const equipment = buildEquipment(spec, bindings, totals);

  return {
    id: spec.id,
    name: spec.name,
    depth,
    current_kwh: meter
      ? round(value(meter, "current"))
      : round(equipment.reduce((s, e) => s + e.current_kwh, 0)),
    previous_kwh: meter
      ? round(value(meter, "previous"))
      : round(equipment.reduce((s, e) => s + e.previous_kwh, 0)),
    current_production: round(value(production, "current")),
    previous_production: round(value(production, "previous")),
    equipment,
  };
}

/**
 * Fetches every bound channel for both windows and assembles the tree.
 *
 * Same signature as `loadPlantTree`, minus the `today` anchor which only the
 * simulation needs.
 */
export async function loadLivePlantTree(
  periods: PeriodPair,
  bindings: PlantBindings,
): Promise<EnergyNode> {
  const channels: ChannelRequest[] = [];
  collectChannels(PLANT, bindings, channels);

  const totals = await fetchChannelTotals(channels, toWindows(periods));
  return buildNode(PLANT, bindings, totals, 0);
}

/** Every equipment id declared in the model, for binding-completeness checks. */
export function allEquipmentIds(spec: NodeSpec = PLANT): string[] {
  const ids = (spec.equipment ?? []).map((e) => e.id);
  for (const child of spec.children ?? []) ids.push(...allEquipmentIds(child));
  return ids;
}
