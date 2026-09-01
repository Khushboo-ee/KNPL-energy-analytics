"use client";

import type { VisibleRow } from "@/lib/tree";
import { EquipmentTable } from "./EquipmentTable";
import { TreeRow } from "./TreeRow";

interface TreeTableProps {
  rows: readonly VisibleRow[];
  onToggle: (id: string) => void;
  onToggleEquipment: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const COLUMNS: { label: string; align: "left" | "right"; group?: boolean }[] = [
  { label: "Section / Subsection", align: "left" },
  { label: "Current kWh", align: "right" },
  { label: "Previous kWh", align: "right" },
  { label: "Δ kWh", align: "right" },
  { label: "Δ % kWh", align: "right" },
  { label: "Current Prod (KL)", align: "right", group: true },
  { label: "Previous Prod (KL)", align: "right" },
  { label: "Δ Production", align: "right" },
  { label: "Δ % Production", align: "right" },
  { label: "Trend", align: "left", group: true },
];

function LegendSwatch({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-[2px] ${className}`} aria-hidden />
      <span>{children}</span>
    </span>
  );
}

/**
 * One expandable tree table for the whole hierarchy — plant, sections,
 * subsections and inline equipment all share a single set of columns so
 * figures line up however deep the user drills.
 */
export function TreeTable({
  rows,
  onToggle,
  onToggleEquipment,
  onExpandAll,
  onCollapseAll,
}: TreeTableProps) {
  return (
    <section
      aria-label="Consumption hierarchy"
      className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-[0_1px_2px_rgba(7,37,58,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">
            Consumption hierarchy
          </h2>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Ranked by |Δ kWh| at every level — the largest mover is always the first
            row. Click a row to drill down.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="expand-all"
            onClick={onExpandAll}
            className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:border-teal/40 hover:bg-teal-soft hover:text-teal"
          >
            Expand all
          </button>
          <button
            type="button"
            data-testid="collapse-all"
            onClick={onCollapseAll}
            className="rounded-md border border-hairline px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted transition-colors hover:border-teal/40 hover:bg-teal-soft hover:text-teal"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Narrow screens scroll the numeric columns horizontally rather than
          compressing or wrapping them. */}
      <div className="scroll-slim overflow-x-auto">
        <table
          data-testid="hierarchy-table"
          className="w-full min-w-[1240px] border-collapse text-[13px]"
        >
          <caption className="sr-only">
            Energy consumption and production by plant section, current period
            against the previous period
          </caption>
          <thead>
            <tr className="border-b border-hairline bg-canvas">
              {COLUMNS.map((column, index) => (
                <th
                  key={column.label}
                  scope="col"
                  className={`px-3 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-ink-muted uppercase ${
                    column.align === "left" ? "text-left" : "text-right"
                  } ${column.group ? "border-l border-hairline" : ""} ${
                    index === 0
                      ? "sticky left-0 z-20 w-[300px] min-w-[300px] border-r border-hairline bg-canvas pl-4"
                      : ""
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.kind === "node" ? (
                <TreeRow
                  key={`node-${row.node.id}`}
                  row={row}
                  onToggle={onToggle}
                  onToggleEquipment={onToggleEquipment}
                />
              ) : (
                <tr key={`equipment-${row.parentId}`} className="bg-canvas">
                  <td colSpan={COLUMNS.length} className="p-0">
                    <EquipmentTable
                      parentName={row.parentName}
                      items={row.items}
                      depth={row.depth}
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline bg-canvas px-4 py-2.5 text-[11px] text-ink-muted">
        <LegendSwatch className="bg-teal">Current period</LegendSwatch>
        <LegendSwatch className="bg-ink-faint/55">Previous period</LegendSwatch>
        <LegendSwatch className="bg-up">Higher consumption / lower output</LegendSwatch>
        <LegendSwatch className="bg-down">Lower consumption / higher output</LegendSwatch>
        <LegendSwatch className="bg-ink-faint">No change</LegendSwatch>
        <span className="text-ink-faint">
          “—” marks a ratio with a zero baseline (no production booked).
        </span>
      </div>
    </section>
  );
}
