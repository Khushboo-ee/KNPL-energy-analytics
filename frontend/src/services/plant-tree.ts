import type { EnergyNode, PeriodPair } from "@/lib/types";
import { loadPlantTree } from "./energy-source";
import { PLANT_BINDINGS, describeCoverage } from "./iosense/bindings";
import { resolveDataSource } from "./iosense/config";
import { allEquipmentIds, loadLivePlantTree } from "./iosense/live-source";

/**
 * Decides where the plant tree comes from and returns it.
 *
 * Server-side only — it reads the IOsense credentials. Both the initial server
 * render and the `/api/plant-tree` route go through here, so a page load and a
 * duration change can never disagree about the source.
 */

export type TreeSource = "iosense" | "simulation";

export interface PlantTreeResult {
  source: TreeSource;
  /** Present only when falling back, explaining why. */
  reason?: string;
  tree: EnergyNode;
}

export async function resolvePlantTree(
  periods: PeriodPair,
  today: string,
): Promise<PlantTreeResult> {
  const simulate = (reason: string): PlantTreeResult => ({
    source: "simulation",
    reason,
    tree: loadPlantTree(periods, today),
  });

  if (resolveDataSource() === "simulation") {
    return simulate(
      process.env.EMS_DATA_SOURCE?.trim().toLowerCase() === "simulation"
        ? "EMS_DATA_SOURCE is set to simulation."
        : "IOsense connection is not configured (IOSENSE_API_BASE_URL / IOSENSE_API_TOKEN).",
    );
  }

  const equipmentIds = allEquipmentIds();
  const coverage = describeCoverage(PLANT_BINDINGS, equipmentIds);

  if (!coverage.complete) {
    // Refusing a partially bound tree is deliberate: mixing real readings with
    // zeroed machines would corrupt the roll-ups and the top-contributor
    // ranking — the one number this dashboard exists to get right.
    const mapped = coverage.meteredNodes.length
      ? ` Mapped so far: ${coverage.meteredNodes.length} zone meter(s), ${coverage.boundEquipment.length} of ${equipmentIds.length} machines.`
      : "";
    return simulate(
      `IOsense is connected, but the channel map is incomplete — ${coverage.missingEquipment.length} of ${equipmentIds.length} machines have no binding.${mapped} Fill in src/services/iosense/bindings.ts.`,
    );
  }

  return {
    source: "iosense",
    tree: await loadLivePlantTree(periods, PLANT_BINDINGS),
  };
}
