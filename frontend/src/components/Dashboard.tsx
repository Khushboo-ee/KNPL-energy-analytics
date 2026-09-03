"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataSourceBanner } from "./DataSourceBanner";
import { KpiCards } from "./KpiCards";
import { TopBar } from "./TopBar";
import { TreeTable } from "./TreeTable";
import { allNodeIds, flattenVisible } from "@/lib/tree";
import { PLANT_LABEL } from "@/services/plant-model";
import type { PlantTreeResult, TreeSource } from "@/services/plant-tree";
import type { DurationSelection, EnergyNode } from "@/lib/types";

interface DashboardProps {
  /** Reference date, resolved on the server so both renders agree. */
  today: string;
  /** The window the server pre-rendered, so first paint has real content. */
  initialDuration: DurationSelection;
  initialTree: EnergyNode;
  initialSource: TreeSource;
  initialReason?: string;
  initialError?: string | null;
}

function toggle(set: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Identifies a comparison window, so we never refetch one we already hold. */
function windowKey(duration: DurationSelection): string {
  const { current, previous } = duration;
  return `${current.start}_${current.end}__${previous.start}_${previous.end}`;
}

export function Dashboard({
  today,
  initialDuration,
  initialTree,
  initialSource,
  initialReason,
  initialError = null,
}: DashboardProps) {
  const [duration, setDuration] = useState<DurationSelection>(initialDuration);
  const [tree, setTree] = useState<EnergyNode>(initialTree);
  const [source, setSource] = useState<TreeSource>(initialSource);
  const [reason, setReason] = useState<string | undefined>(initialReason);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  // The plant row is open on arrival; sections start collapsed.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(["plant"]));
  const [equipmentOpen, setEquipmentOpen] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // The server already rendered this window, so the first effect run is a no-op.
  const loadedKey = useRef(windowKey(initialDuration));

  useEffect(() => {
    const key = windowKey(duration);
    if (key === loadedKey.current) return;

    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      cs: duration.current.start,
      ce: duration.current.end,
      ps: duration.previous.start,
      pe: duration.previous.end,
      today,
    });

    fetch(`/api/plant-tree?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? `Request failed (${response.status})`);
        }
        return payload as PlantTreeResult;
      })
      .then((result) => {
        loadedKey.current = key;
        setTree(result.tree);
        setSource(result.source);
        setReason(result.reason);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Could not load this period.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [duration, today]);

  const rows = useMemo(
    () => flattenVisible(tree, expanded, equipmentOpen),
    [tree, expanded, equipmentOpen],
  );

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => toggle(prev, id));
  }, []);

  const onToggleEquipment = useCallback((id: string) => {
    setEquipmentOpen((prev) => toggle(prev, id));
  }, []);

  const onExpandAll = useCallback(() => {
    setExpanded(new Set(allNodeIds(tree)));
  }, [tree]);

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

      <main
        className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 lg:px-6 lg:py-5"
        aria-busy={loading}
      >
        <DataSourceBanner source={source} reason={reason} error={error} />

        {/* Figures dim while a new window loads, so a stale reading is never
            mistaken for the one just requested. */}
        <div
          className={
            loading ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"
          }
          data-testid="dashboard-body"
          data-loading={loading}
        >
          <KpiCards plant={tree} duration={duration} />

          <div className="mt-4">
            <TreeTable
              rows={rows}
              onToggle={onToggle}
              onToggleEquipment={onToggleEquipment}
              onExpandAll={onExpandAll}
              onCollapseAll={onCollapseAll}
            />
          </div>
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
