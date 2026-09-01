import {
  deltaKwh,
  deltaPctKwh,
  deltaProduction,
  deltaPctProduction,
  deltaRunHrs,
  marginalKw,
  marginalLoadPct,
  loadStatus,
  currentSpc,
  previousSpc,
} from "@/lib/metrics";
import { formatDate, formatRange } from "@/lib/format";
import type { VisibleRow } from "@/lib/tree";
import type { DurationSelection } from "@/lib/types";

/**
 * Builds the export payload from exactly what the user is looking at.
 *
 * The report mirrors the on-screen state: only the hierarchy levels currently
 * expanded are included, in the same ranked order, and only the equipment
 * panels currently open. Collapsing a branch removes it from the export.
 */

export type CellKind =
  | "text"
  | "kwh"
  | "deltaKwh"
  | "kl"
  | "deltaKl"
  | "pct"
  | "hrs"
  | "deltaHrs"
  | "kw"
  | "loadPct"
  | "spc";

export interface ReportColumn {
  label: string;
  kind: CellKind;
  width: number;
}

export type Cell = string | number | null;

export interface ReportTable {
  title: string;
  columns: ReportColumn[];
  rows: Cell[][];
  /** Row indices to emphasise (the plant total line). */
  emphasisRows: number[];
}

export interface ReportDoc {
  title: string;
  subtitle: string;
  meta: [string, string][];
  tables: ReportTable[];
  fileStem: string;
}

const INDENT = "    ";

const HIERARCHY_COLUMNS: ReportColumn[] = [
  { label: "Section / Subsection", kind: "text", width: 34 },
  { label: "Current kWh", kind: "kwh", width: 14 },
  { label: "Previous kWh", kind: "kwh", width: 14 },
  { label: "Δ kWh", kind: "deltaKwh", width: 13 },
  { label: "Δ % kWh", kind: "pct", width: 11 },
  { label: "Current Prod (KL)", kind: "kl", width: 16 },
  { label: "Previous Prod (KL)", kind: "kl", width: 17 },
  { label: "Δ Production", kind: "deltaKl", width: 14 },
  { label: "Δ % Production", kind: "pct", width: 15 },
  { label: "SPC Current", kind: "spc", width: 12 },
  { label: "SPC Previous", kind: "spc", width: 13 },
];

const EQUIPMENT_COLUMNS: ReportColumn[] = [
  { label: "Location", kind: "text", width: 26 },
  { label: "Machine", kind: "text", width: 30 },
  { label: "Current kWh", kind: "kwh", width: 14 },
  { label: "Previous kWh", kind: "kwh", width: 14 },
  { label: "Δ kWh", kind: "deltaKwh", width: 13 },
  { label: "Current Run Hrs", kind: "hrs", width: 15 },
  { label: "Previous Run Hrs", kind: "hrs", width: 16 },
  { label: "Δ Run Hrs", kind: "deltaHrs", width: 12 },
  { label: "Marginal kW", kind: "kw", width: 13 },
  { label: "Rated kW", kind: "kw", width: 11 },
  { label: "Marginal Load %", kind: "loadPct", width: 16 },
  { label: "Status", kind: "text", width: 13 },
];

const STATUS_LABEL: Record<string, string> = {
  "idle-heavy": "Idle-heavy",
  overload: "Overload",
  normal: "Normal",
  unknown: "No change",
};

export function buildReport(
  rows: readonly VisibleRow[],
  duration: DurationSelection,
  plantName: string,
): ReportDoc {
  const hierarchyRows: Cell[][] = [];
  const emphasisRows: number[] = [];
  const equipmentRows: Cell[][] = [];

  rows.forEach((row) => {
    if (row.kind === "node") {
      const { node, depth } = row;
      if (depth === 0) emphasisRows.push(hierarchyRows.length);
      hierarchyRows.push([
        `${INDENT.repeat(depth)}${node.name}`,
        node.current_kwh,
        node.previous_kwh,
        deltaKwh(node),
        deltaPctKwh(node),
        node.current_production,
        node.previous_production,
        deltaProduction(node),
        deltaPctProduction(node),
        currentSpc(node),
        previousSpc(node),
      ]);
      return;
    }

    row.items.forEach((item) => {
      equipmentRows.push([
        row.parentName,
        item.name,
        item.current_kwh,
        item.previous_kwh,
        deltaKwh(item),
        item.current_run_hrs,
        item.previous_run_hrs,
        deltaRunHrs(item),
        marginalKw(item),
        item.rated_kw,
        marginalLoadPct(item),
        STATUS_LABEL[loadStatus(marginalLoadPct(item))],
      ]);
    });
  });

  const tables: ReportTable[] = [
    {
      title: "Hierarchy — energy vs production",
      columns: HIERARCHY_COLUMNS,
      rows: hierarchyRows,
      emphasisRows,
    },
  ];

  if (equipmentRows.length > 0) {
    tables.push({
      title: "Equipment detail",
      columns: EQUIPMENT_COLUMNS,
      rows: equipmentRows,
      emphasisRows: [],
    });
  }

  return {
    title: `EMS Analytics — ${plantName}`,
    subtitle: duration.label,
    meta: [
      ["Current period", formatRange(duration.current.start, duration.current.end)],
      ["Previous period", formatRange(duration.previous.start, duration.previous.end)],
      ["Comparison", duration.label],
      ["Levels included", `${hierarchyRows.length} rows as displayed`],
      ["Equipment rows", `${equipmentRows.length}`],
    ],
    tables,
    fileStem: `EMS-Analytics_${plantName.replace(/\s+/g, "-")}_${duration.current.start}_to_${duration.current.end}`,
  };
}

/** Human-readable stamp used in the document footer. */
export function reportStamp(today: string): string {
  return `Generated ${formatDate(today)}`;
}
