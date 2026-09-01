"use client";

import { useCallback, useMemo, useState } from "react";
import { KpiCards } from "./KpiCards";
import { TopBar } from "./TopBar";
import { TreeTable } from "./TreeTable";
import { allNodeIds, flattenVisible } from "@/lib/tree";
import { resolvePreset } from "@/lib/periods";
import { loadPlantTree } from "@/services/energy-source";
import { PLANT_LABEL } from "@/services/plant-model";
import type { DurationSelection } from "@/lib/types";

interface DashboardProps {
  /** Reference date, resolved on the server so both renders agree. */
  today: string;
}

function toggle(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function Dashboard({ today }: DashboardProps) {
  const [duration, setDuration] = useState<DurationSelection>(() =>
    resolvePreset("month", today),
  );
  // The plant row is open on arrival; sections start collapsed.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(["plant"]));
  const [equipmentOpen, setEquipmentOpen] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const plant = useMemo(() => loadPlantTree(duration, today), [duration, today]);
  const rows = useMemo(
    () => flattenVisible(plant, expanded, equipmentOpen),
    [plant, expanded, equipmentOpen],
  );

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => toggle(prev, id));
  }, []);

  const onToggleEquipment = useCallback((id: string) => {
    setEquipmentOpen((prev) => toggle(prev, id));
  }, []);

  const onExpandAll = useCallback(() => {
    setExpanded(new Set(allNodeIds(plant)));
  }, [plant]);

  const onCollapseAll = useCallback(() => {
    setExpanded(new Set(["plant"]));
    setEquipmentOpen(new Set());
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <TopBar
        plantName={PLANT_LABEL}
        duration={duration}
        today={today}
        rows={rows}
        onDurationChange={setDuration}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 lg:px-6 lg:py-5">
        <KpiCards plant={plant} duration={duration} />

        <div className="mt-4">
          <TreeTable
            rows={rows}
            onToggle={onToggle}
            onToggleEquipment={onToggleEquipment}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
          />
        </div>
      </main>

      <footer className="border-t border-hairline px-4 py-3 text-[11px] text-ink-faint lg:px-6">
        <div className="mx-auto max-w-[1600px]">
          EMS Analytics · {PLANT_LABEL} · all deltas, percentages, SPC and marginal
          load figures are computed from the underlying readings at render time.
        </div>
      </footer>
    </div>
  );
}
