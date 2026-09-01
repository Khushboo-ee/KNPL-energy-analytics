import { downloadBlob, NUMBER_FORMATS } from "./format-cell";
import type { ReportDoc, ReportTable } from "./report";

/**
 * Writes the on-screen view to a real `.xlsx` workbook — one sheet for the
 * hierarchy, one for equipment detail when panels are open. Values are written
 * as numbers with display number-formats so the recipient can pivot and
 * re-total them rather than re-typing figures out of a picture.
 *
 * ExcelJS is imported lazily so its bundle only loads if a user actually
 * exports.
 */

const NAVY = "FF0B3550";
const HAIRLINE = "FFE2E8ED";
const RED = "FFC0392B";
const GREEN = "FF2E9E6D";
const INK = "FF10222E";

// ExcelJS ships loose cell/worksheet typings; the writer below is the only
// place that touches them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Worksheet = any;

function writeTable(sheet: Worksheet, table: ReportTable, doc: ReportDoc): void {
  const titleRow = sheet.addRow([doc.title]);
  titleRow.font = { bold: true, size: 14, color: { argb: NAVY } };
  sheet.addRow([`${table.title} · ${doc.subtitle}`]).font = {
    size: 10,
    color: { argb: "FF5B6B78" },
  };
  doc.meta.forEach(([label, value]) => {
    const row = sheet.addRow([`${label}: ${value}`]);
    row.font = { size: 9, color: { argb: "FF5B6B78" } };
  });
  sheet.addRow([]);

  const header = sheet.addRow(table.columns.map((column) => column.label));
  header.eachCell((cell: Worksheet) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: HAIRLINE } } };
  });
  const headerRowNumber = header.number;

  table.rows.forEach((cells, rowIndex) => {
    const emphasised = table.emphasisRows.includes(rowIndex);
    const row = sheet.addRow(cells.map((value) => (value === null ? "—" : value)));

    row.eachCell({ includeEmpty: true }, (cell: Worksheet, columnIndex: number) => {
      const column = table.columns[columnIndex - 1];
      if (!column) return;

      const isNumeric = typeof cell.value === "number";
      if (isNumeric && NUMBER_FORMATS[column.kind]) {
        cell.numFmt = NUMBER_FORMATS[column.kind] as string;
      }

      cell.font = {
        size: 10,
        bold: emphasised,
        color: { argb: INK },
      };

      // Deltas carry the same red-up / green-down reading as the dashboard.
      if (isNumeric && (column.kind === "deltaKwh" || column.kind === "pct")) {
        const value = cell.value as number;
        if (value > 0) cell.font = { ...cell.font, color: { argb: RED } };
        else if (value < 0) cell.font = { ...cell.font, color: { argb: GREEN } };
      }
      if (column.label === "Status" && typeof cell.value === "string") {
        const status = cell.value;
        if (status === "Idle-heavy" || status === "Overload") {
          cell.font = { ...cell.font, bold: true, color: { argb: RED } };
        } else if (status === "Normal") {
          cell.font = { ...cell.font, color: { argb: GREEN } };
        }
      }

      cell.alignment = {
        horizontal: column.kind === "text" ? "left" : "right",
        vertical: "middle",
      };
      cell.border = { bottom: { style: "hair", color: { argb: HAIRLINE } } };
      if (emphasised) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFEDF2F5" },
        };
      }
    });
  });

  sheet.columns = table.columns.map((column) => ({ width: column.width }));
  // Freeze under the header so long hierarchies stay readable while scrolling.
  sheet.views = [{ state: "frozen", ySplit: headerRowNumber, xSplit: 1 }];
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: table.columns.length },
  };
}

export async function downloadExcel(doc: ReportDoc): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EMS Analytics";
  workbook.created = new Date();

  doc.tables.forEach((table, index) => {
    const sheet = workbook.addWorksheet(index === 0 ? "Hierarchy" : "Equipment", {
      properties: { defaultRowHeight: 18 },
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    writeTable(sheet, table, doc);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${doc.fileStem}.xlsx`,
  );
}
