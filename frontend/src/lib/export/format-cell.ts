import {
  formatDeltaHours,
  formatDeltaKl,
  formatDeltaKwh,
  formatHours,
  formatKl,
  formatKw,
  formatKwh,
  formatPct,
  formatPlainPct,
  formatSpc,
  EM_DASH,
} from "@/lib/format";
import type { Cell, CellKind } from "./report";

/** Excel number formats, matched to the on-screen precision of each column. */
export const NUMBER_FORMATS: Record<CellKind, string | undefined> = {
  text: undefined,
  kwh: "#,##0",
  deltaKwh: '+#,##0;−#,##0;0',
  kl: "#,##0.0",
  deltaKl: '+#,##0.0;−#,##0.0;0.0',
  pct: '+0.0"%";−0.0"%";0.0"%"',
  hrs: "#,##0.0",
  deltaHrs: '+#,##0.0;−#,##0.0;0.0',
  kw: "#,##0.00",
  loadPct: '0.0"%"',
  spc: "#,##0.00",
};

/** Renders a cell as text — used by the PDF writer and as the null fallback. */
export function renderCell(value: Cell, kind: CellKind): string {
  if (value === null || value === undefined) return EM_DASH;
  if (typeof value === "string") return value;

  switch (kind) {
    case "kwh":
      return formatKwh(value);
    case "deltaKwh":
      return formatDeltaKwh(value);
    case "kl":
      return formatKl(value);
    case "deltaKl":
      return formatDeltaKl(value);
    case "pct":
      return formatPct(value);
    case "hrs":
      return formatHours(value);
    case "deltaHrs":
      return formatDeltaHours(value);
    case "kw":
      return formatKw(value);
    case "loadPct":
      return formatPlainPct(value);
    case "spc":
      return formatSpc(value);
    default:
      return String(value);
  }
}

export const DELTA_KINDS: ReadonlySet<CellKind> = new Set<CellKind>([
  "deltaKwh",
  "pct",
  "deltaKl",
  "deltaHrs",
]);

/** Triggers a browser download for a generated file. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Give the browser a tick to start the transfer before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
