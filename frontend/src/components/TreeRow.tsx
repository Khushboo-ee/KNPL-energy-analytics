"use client";

import {
  currentSpc,
  deltaKwh,
  deltaPctKwh,
  deltaPctProduction,
  deltaProduction,
  previousSpc,
} from "@/lib/metrics";
import {
  formatDeltaKl,
  formatDeltaKwh,
  formatKl,
  formatKwh,
  formatPct,
  formatSpc,
  EM_DASH,
} from "@/lib/format";
import { energyTone, outputTone } from "@/lib/delta-style";
import type { NodeRow } from "@/lib/tree";
import { ComparisonBars } from "./ComparisonBars";
import { DeltaValue } from "./DeltaValue";
import { ChevronRight } from "./icons";

interface TreeRowProps {
  row: NodeRow;
  onToggle: (id: string) => void;
  onToggleEquipment: (id: string) => void;
}

const INDENT_STEP = 22;

export function TreeRow({ row, onToggle, onToggleEquipment }: TreeRowProps) {
  const { node, depth, expandable, expanded, isDeepest, equipmentOpen } = row;

  const energyDelta = deltaKwh(node);
  const productionDelta = deltaProduction(node);
  const isRoot = depth === 0;
  const interactive = expandable || isDeepest;

  // Clicking anywhere on the row does the row's natural thing: open the next
  // level down, or open the machines when there is no next level.
  const activate = () => {
    if (expandable) onToggle(node.id);
    else if (isDeepest) onToggleEquipment(node.id);
  };

  const surface = isRoot
    ? { base: "bg-[#E9EFF4]", hover: "group-hover:bg-[#DFE8EE]" }
    : { base: "bg-surface", hover: "group-hover:bg-canvas" };

  const spcNow = currentSpc(node);
  const spcBefore = previousSpc(node);

  return (
    <tr
      data-testid={`row-${node.id}`}
      data-depth={depth}
      data-expanded={expanded}
      className={`group row-reveal border-b border-hairline transition-colors ${
        isRoot ? "font-semibold hover:bg-[#DFE8EE]" : "hover:bg-canvas"
      } ${interactive ? "cursor-pointer" : ""}`}
      onClick={interactive ? activate : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-expanded={expandable ? expanded : isDeepest ? equipmentOpen : undefined}
    >
      {/* Name column stays pinned so the hierarchy remains readable while the
          numeric columns scroll horizontally on narrow screens. */}
      <th
        scope="row"
        className={`sticky left-0 z-10 w-[300px] min-w-[300px] border-r border-hairline py-2.5 pr-3 text-left align-middle font-normal transition-colors ${surface.base} ${surface.hover}`}
        style={{ paddingLeft: `${14 + depth * INDENT_STEP}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {expandable ? (
            <ChevronRight
              className={`text-[15px] text-ink-muted transition-transform duration-200 ${
                expanded ? "rotate-90" : ""
              }`}
            />
          ) : (
            <span className="inline-block w-[1em] shrink-0" aria-hidden />
          )}

          <span className="flex min-w-0 flex-col leading-tight">
            <span
              className={`truncate ${
                isRoot
                  ? "text-[14px] font-bold text-navy-700"
                  : depth === 1
                    ? "text-[13px] font-semibold text-ink"
                    : "text-[13px] font-medium text-ink"
              }`}
            >
              {node.name}
            </span>
            <span
              className="num mt-0.5 text-[10px] whitespace-nowrap text-ink-faint"
              title={
                spcNow === null && spcBefore === null
                  ? "No production booked, so specific consumption is undefined"
                  : `Specific consumption, kWh per KL: ${formatSpc(spcBefore)} previous → ${formatSpc(spcNow)} current`
              }
            >
              {spcNow === null && spcBefore === null ? (
                <>SPC {EM_DASH} · no production</>
              ) : (
                <>
                  SPC {formatSpc(spcBefore)} → {formatSpc(spcNow)}
                </>
              )}
            </span>
          </span>

          {isDeepest && (
            <button
              type="button"
              data-testid={`view-equipment-${node.id}`}
              aria-expanded={equipmentOpen}
              onClick={(event) => {
                event.stopPropagation();
                onToggleEquipment(node.id);
              }}
              className={`ml-1 shrink-0 rounded-full border px-2 py-[3px] text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase transition-colors ${
                equipmentOpen
                  ? "border-amber bg-amber text-navy-900"
                  : "border-teal/35 bg-teal-soft text-teal hover:border-teal hover:bg-teal hover:text-white"
              }`}
            >
              {equipmentOpen ? "Hide equipment" : "View equipment"}
            </button>
          )}
        </div>
      </th>

      <td className="num px-3 py-2.5 text-right text-[13px] text-ink">
        {formatKwh(node.current_kwh)}
      </td>
      <td className="num px-3 py-2.5 text-right text-[13px] text-ink-muted">
        {formatKwh(node.previous_kwh)}
      </td>
      <td className="px-3 py-2.5 text-right text-[13px]">
        <DeltaValue text={formatDeltaKwh(energyDelta)} tone={energyTone(energyDelta)} strong />
      </td>
      <td className="px-3 py-2.5 text-right text-[13px]">
        <DeltaValue text={formatPct(deltaPctKwh(node))} tone={energyTone(energyDelta)} />
      </td>

      <td className="num border-l border-hairline px-3 py-2.5 text-right text-[13px] text-ink">
        {formatKl(node.current_production)}
      </td>
      <td className="num px-3 py-2.5 text-right text-[13px] text-ink-muted">
        {formatKl(node.previous_production)}
      </td>
      <td className="px-3 py-2.5 text-right text-[13px]">
        <DeltaValue
          text={formatDeltaKl(productionDelta)}
          tone={outputTone(productionDelta)}
        />
      </td>
      <td className="px-3 py-2.5 text-right text-[13px]">
        <DeltaValue
          text={formatPct(deltaPctProduction(node))}
          tone={outputTone(productionDelta)}
        />
      </td>

      <td className="border-l border-hairline px-3 py-2.5">
        <ComparisonBars
          current={node.current_kwh}
          previous={node.previous_kwh}
          scale={row.siblingScale}
          label={`${node.name}: current ${formatKwh(node.current_kwh)} kWh vs previous ${formatKwh(node.previous_kwh)} kWh`}
        />
      </td>
    </tr>
  );
}
