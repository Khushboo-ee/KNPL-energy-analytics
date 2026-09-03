import type { ChannelOperator } from "./widget-data";

/**
 * Which IOsense channel backs each node of the Bawal plant tree.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONE THING THAT CANNOT BE DERIVED FROM THE API CONTRACT.
 * Data is always addressed by `(devID, sensor)`. Nothing in the connector
 * knows that "Grinding Block" is zone meter KNBWEM_Z3 — that is site
 * knowledge and has to be stated here.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * List the ids this token can see with:
 *     node scripts/discover-iosense.mjs
 */

/** A measurement channel on a physical device. */
export interface ChannelBinding {
  devID: string;
  /** Positional sensor id on the device, e.g. "D30". */
  sensor: string;
  operator?: ChannelOperator;
}

/** A measurement expressed as a cluster (load entity) rather than a device. */
export interface ClusterBinding {
  clusterID: string;
  operator?: ChannelOperator;
}

export type Binding = ChannelBinding | ClusterBinding;

export function isClusterBinding(binding: Binding): binding is ClusterBinding {
  return "clusterID" in binding;
}

/** Machine-level bindings. */
export interface EquipmentBinding {
  energyKwh: Binding;
  /** Omit when there is no run-hour channel; marginal load then reads "—". */
  runHours?: Binding;
}

/** Section/subsection bindings. */
export interface NodeBinding {
  /**
   * A meter covering this whole node — a zone meter, typically.
   *
   * When present it is authoritative and used *instead of* summing the
   * children, because a zone meter also captures losses and small unmetered
   * loads that a sum over named machines misses.
   */
  energyKwh?: Binding;
  /** Booked output. Omit for non-producing blocks (R&D, RM, Utility). */
  productionKl?: Binding;
}

export interface PlantBindings {
  /** Keyed by node ids from `plant-model.ts` (e.g. "plant", "paint-grinding"). */
  nodes: Record<string, NodeBinding>;
  /** Keyed by equipment ids from `plant-model.ts` (e.g. "pg-ch2"). */
  equipment: Record<string, EquipmentBinding>;
}

export const PLANT_BINDINGS: PlantBindings = {
  nodes: {
    /**
     * Plant-wide incomer. D30 is a cumulative kWh register, so the window
     * figure is last − first; see `planEntries` in widget-data.ts for why that
     * is issued as max − min.
     */
    plant: {
      energyKwh: { devID: "KNBWEM_Z1", sensor: "D30", operator: "consumption" },
    },

    // TODO(site): zone meters for the seven sections, and the production
    // channels (KL) for Paint Plant, CED F2, PC Plant and Resin Plant.
    // R&D, RM and Utility book no production and need only an energy binding.
  },
  equipment: {
    // TODO(site): per-machine energy (and run-hours, where metered).
  },
};

/* --------------------------------- coverage -------------------------------- */

export interface BindingCoverage {
  /** Node ids with a direct energy meter. */
  meteredNodes: string[];
  /** Equipment ids with an energy channel. */
  boundEquipment: string[];
  /** Equipment ids still unmapped. */
  missingEquipment: string[];
  /** True when the whole tree can be served from live data. */
  complete: boolean;
}

/**
 * A node can be served live if it has its own meter, or if every machine
 * beneath it is bound. Anything else would mix real readings with zeros.
 */
export function describeCoverage(
  bindings: PlantBindings,
  equipmentIds: readonly string[],
): BindingCoverage {
  const boundEquipment = equipmentIds.filter((id) => bindings.equipment[id]?.energyKwh);
  const missingEquipment = equipmentIds.filter((id) => !bindings.equipment[id]?.energyKwh);

  return {
    meteredNodes: Object.keys(bindings.nodes).filter((id) => bindings.nodes[id]?.energyKwh),
    boundEquipment,
    missingEquipment,
    complete: equipmentIds.length > 0 && missingEquipment.length === 0,
  };
}
