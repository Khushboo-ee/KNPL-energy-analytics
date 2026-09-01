"use client";

import {
  deltaKwh,
  deltaRunHrs,
  equipmentLoadStatus,
  marginalKw,
  marginalLoadPct,
} from "@/lib/metrics";
import {
  formatDeltaHours,
  formatDeltaKwh,
  formatHours,
  formatKw,
  formatKwh,
} from "@/lib/format";
import { energyTone } from "@/lib/delta-style";
import type { Equipment } from "@/lib/types";
import { DeltaValue } from "./DeltaValue";
import { LoadBadge } from "./LoadBadge";

const HEADINGS = [
  "Machine",
  "Current kWh",
  "Previous kWh",
  "Δ kWh",
  "Current Run Hrs",
  "Previous Run Hrs",
  "Δ Run Hrs",
  "Marginal kW",
  "Rated kW",
  "Marginal Load %",
];

interface EquipmentTableProps {
  parentName: string;
  items: readonly Equipment[];
  /** Indentation depth of the owning row, so the panel lines up beneath it. */
  depth: number;
}

/**
 * Machine-level detail, rendered inline beneath its section rather than on a
 * separate page. Ranked by |Δ kWh| like every other level, so the machine
 * responsible for the section's movement is the first row.
 */
export function EquipmentTable({ parentName, items, depth }: EquipmentTableProps) {
  return (
    <div className="panel-reveal">
      <div>
        <div
          className="border-y border-hairline bg-canvas py-3 pr-3"
          style={{ paddingLeft: `${16 + depth * 18}px` }}
        >
          <div className="overflow-hidden rounded-md border border-hairline bg-surface">
            <div className="flex items-center gap-2 border-b border-hairline bg-teal-soft/70 px-3 py-2">
              <span className="text-[11px] font-semibold tracking-wide text-teal uppercase">
                Equipment
              </span>
              <span className="text-[11px] text-ink-muted">
                {parentName} · {items.length} machines · ranked by |Δ kWh|
              </span>
            </div>

            <table className="w-full min-w-[900px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas/70">
                  {HEADINGS.map((heading, index) => (
                    <th
                      key={heading}
                      scope="col"
                      className={`px-3 py-2 font-semibold whitespace-nowrap text-ink-muted ${
                        index === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const energyDelta = deltaKwh(item);
                  const hoursDelta = deltaRunHrs(item);
                  const loadPct = marginalLoadPct(item);

                  return (
                    <tr
                      key={item.id}
                      data-testid={`equipment-row-${item.id}`}
                      className="border-b border-hairline/70 last:border-0 hover:bg-canvas/80"
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-medium whitespace-nowrap text-ink"
                      >
                        {item.name}
                      </th>
                      <td className="num px-3 py-2 text-right text-ink">
                        {formatKwh(item.current_kwh)}
                      </td>
                      <td className="num px-3 py-2 text-right text-ink-muted">
                        {formatKwh(item.previous_kwh)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DeltaValue
                          text={formatDeltaKwh(energyDelta)}
                          tone={energyTone(energyDelta)}
                        />
                      </td>
                      <td className="num px-3 py-2 text-right text-ink">
                        {formatHours(item.current_run_hrs)}
                      </td>
                      <td className="num px-3 py-2 text-right text-ink-muted">
                        {formatHours(item.previous_run_hrs)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <DeltaValue
                          text={formatDeltaHours(hoursDelta)}
                          tone={energyTone(hoursDelta)}
                        />
                      </td>
                      <td className="num px-3 py-2 text-right font-medium text-ink">
                        {formatKw(marginalKw(item))}
                      </td>
                      <td className="num px-3 py-2 text-right text-ink-muted">
                        {formatKw(item.rated_kw)}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <LoadBadge pct={loadPct} status={equipmentLoadStatus(item)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
