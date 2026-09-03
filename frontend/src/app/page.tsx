import { Dashboard } from "@/components/Dashboard";
import { resolvePreset, toIso } from "@/lib/periods";
import { IosenseError } from "@/services/iosense/api";
import { loadPlantTree } from "@/services/energy-source";
import { resolvePlantTree, type PlantTreeResult } from "@/services/plant-tree";

// Readings and period presets are both relative to "now", so the page is
// rendered per request rather than frozen at build time.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Resolved once on the server and handed down, so the server and client
  // agree on today's date and hydration stays clean.
  const today = toIso(new Date());
  const duration = resolvePreset("month", today);
  const periods = { current: duration.current, previous: duration.previous };

  let result: PlantTreeResult;
  let error: string | null = null;

  try {
    result = await resolvePlantTree(periods, today);
  } catch (cause) {
    // The connector is configured but unreachable. Fall back to the simulation
    // and say so loudly, rather than passing demo numbers off as readings.
    console.error("[page] IOsense request failed:", cause);
    error = cause instanceof IosenseError ? cause.message : "Could not reach IOsense.";
    result = {
      source: "simulation",
      reason: "The live request failed, so simulated figures are shown.",
      tree: loadPlantTree(periods, today),
    };
  }

  return (
    <Dashboard
      today={today}
      initialDuration={duration}
      initialTree={result.tree}
      initialSource={result.source}
      initialReason={result.reason}
      initialError={error}
    />
  );
}
