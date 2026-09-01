import { downloadBlob, renderCell } from "./format-cell";
import type { Cell, ReportDoc, ReportTable } from "./report";

/**
 * Renders the on-screen view to a landscape PDF, one table per section, using
 * the dashboard's own colour reading for deltas and equipment status.
 *
 * jsPDF's built-in fonts are WinAnsi-encoded, so the typographic glyphs the UI
 * uses (Δ, U+2212 minus, em dash) have to be transliterated or they emit as
 * mojibake.
 */

const NAVY: [number, number, number] = [11, 53, 80];
const INK: [number, number, number] = [16, 34, 46];
const MUTED: [number, number, number] = [91, 107, 120];
const HAIRLINE: [number, number, number] = [226, 232, 237];
const BAND: [number, number, number] = [246, 248, 249];
const RED: [number, number, number] = [192, 57, 43];
const GREEN: [number, number, number] = [46, 158, 109];

function winAnsi(text: string): string {
  return text
    .replace(/Δ/g, "Delta ")
    .replace(/−/g, "-")
    .replace(/—/g, "-")
    .replace(/–/g, "-");
}

function numericValue(value: Cell): number | null {
  return typeof value === "number" ? value : null;
}

export async function downloadPdf(doc: ReportDoc, stamp: string): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 32;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(...NAVY);
  pdf.text(winAnsi(doc.title), margin, 42);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(winAnsi(doc.subtitle), margin, 58);

  const metaText = doc.meta
    .slice(0, 3)
    .map(([label, value]) => `${label}: ${value}`)
    .join("     ");
  pdf.text(winAnsi(metaText), margin, 72);

  pdf.setDrawColor(...HAIRLINE);
  pdf.line(margin, 82, pageWidth - margin, 82);

  let cursorY = 96;

  doc.tables.forEach((table: ReportTable) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text(winAnsi(table.title), margin, cursorY);

    autoTable(pdf, {
      startY: cursorY + 8,
      margin: { left: margin, right: margin, bottom: 40 },
      head: [table.columns.map((column) => winAnsi(column.label))],
      body: table.rows.map((row) =>
        row.map((value, index) => winAnsi(renderCell(value, table.columns[index].kind))),
      ),
      styles: {
        font: "helvetica",
        fontSize: 7.2,
        cellPadding: 3.5,
        textColor: INK,
        lineColor: HAIRLINE,
        lineWidth: 0.4,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
        valign: "middle",
      },
      columnStyles: Object.fromEntries(
        table.columns.map((column, index) => [
          index,
          {
            halign: column.kind === "text" ? "left" : "right",
            cellWidth: column.kind === "text" ? "auto" : "auto",
          },
        ]),
      ),
      didParseCell: (data) => {
        if (data.section !== "body") return;
        const column = table.columns[data.column.index];
        const raw = table.rows[data.row.index]?.[data.column.index];

        if (table.emphasisRows.includes(data.row.index)) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = BAND;
        }

        const value = numericValue(raw);
        if (value !== null && (column.kind === "deltaKwh" || column.kind === "pct")) {
          if (value > 0) data.cell.styles.textColor = RED;
          else if (value < 0) data.cell.styles.textColor = GREEN;
        }

        if (column.label === "Status" && typeof raw === "string") {
          if (raw === "Idle-heavy" || raw === "Overload") {
            data.cell.styles.textColor = RED;
            data.cell.styles.fontStyle = "bold";
          } else if (raw === "Normal") {
            data.cell.styles.textColor = GREEN;
          }
        }
      },
      didDrawPage: () => {
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...MUTED);
        pdf.text(winAnsi(stamp), margin, pageHeight - 18);
        pdf.text(
          `Page ${pdf.getNumberOfPages()}`,
          pageWidth - margin,
          pageHeight - 18,
          { align: "right" },
        );
      },
    });

    // `lastAutoTable` is where autoTable records the bottom of what it drew.
    const lastY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? cursorY;
    cursorY = lastY + 28;
  });

  downloadBlob(pdf.output("blob"), `${doc.fileStem}.pdf`);
}
