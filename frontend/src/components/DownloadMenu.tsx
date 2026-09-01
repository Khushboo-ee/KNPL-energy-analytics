"use client";

import { useCallback, useState } from "react";
import { useDismissable } from "@/hooks/useDismissable";
import { downloadExcel } from "@/lib/export/excel";
import { downloadPdf } from "@/lib/export/pdf";
import { buildReport, reportStamp } from "@/lib/export/report";
import type { VisibleRow } from "@/lib/tree";
import type { DurationSelection } from "@/lib/types";
import { ChevronDown, DocIcon, DownloadIcon, SheetIcon, SpinnerIcon } from "./icons";

interface DownloadMenuProps {
  rows: readonly VisibleRow[];
  duration: DurationSelection;
  today: string;
  plantName: string;
}

type Job = "xlsx" | "pdf" | null;

/**
 * Exports exactly the hierarchy the user has open — same rows, same ranking,
 * same period — flattened into a table. Both writers are code-split so their
 * bundles load on first use rather than on page load.
 */
export function DownloadMenu({ rows, duration, today, plantName }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [job, setJob] = useState<Job>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  const run = useCallback(
    async (kind: Exclude<Job, null>) => {
      setJob(kind);
      setError(null);
      try {
        const doc = buildReport(rows, duration, plantName);
        if (kind === "xlsx") {
          await downloadExcel(doc);
        } else {
          await downloadPdf(doc, reportStamp(today));
        }
        setOpen(false);
      } catch (cause) {
        console.error("Report export failed", cause);
        setError("Export failed. Please try again.");
      } finally {
        setJob(null);
      }
    },
    [rows, duration, today, plantName],
  );

  const busy = job !== null;
  const nodeCount = rows.filter((row) => row.kind === "node").length;
  const equipmentCount = rows.reduce(
    (sum, row) => (row.kind === "equipment" ? sum + row.items.length : sum),
    0,
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="download-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-amber px-3.5 py-2 text-[13px] font-semibold text-navy-900 transition-colors hover:bg-amber-dark disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:w-auto"
      >
        {busy ? <SpinnerIcon className="text-[15px]" /> : <DownloadIcon className="text-[15px]" />}
        <span>{busy ? "Preparing…" : "Download Report"}</span>
        <ChevronDown
          className={`text-[13px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Download report"
          data-testid="download-menu"
          className="absolute right-0 z-50 mt-2 w-[17.5rem] overflow-hidden rounded-lg border border-hairline bg-white shadow-[0_16px_40px_-12px_rgba(7,37,58,0.35)]"
        >
          <p className="border-b border-hairline bg-canvas px-3.5 py-2.5 text-[11px] leading-snug text-ink-muted">
            Exports the <span className="font-semibold text-ink">{nodeCount}</span> rows
            currently expanded
            {equipmentCount > 0 && (
              <>
                {" "}
                and <span className="font-semibold text-ink">{equipmentCount}</span> equipment
                rows
              </>
            )}
            , for {duration.label.toLowerCase()}.
          </p>

          <button
            type="button"
            role="menuitem"
            data-testid="download-xlsx"
            disabled={busy}
            onClick={() => run("xlsx")}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-teal-soft disabled:opacity-60"
          >
            <SheetIcon className="text-[16px] text-teal" />
            <span className="font-medium">Download as Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            role="menuitem"
            data-testid="download-pdf"
            disabled={busy}
            onClick={() => run("pdf")}
            className="flex w-full items-center gap-2.5 border-t border-hairline px-3.5 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-teal-soft disabled:opacity-60"
          >
            <DocIcon className="text-[16px] text-teal" />
            <span className="font-medium">Download as PDF</span>
          </button>

          {error && (
            <p role="alert" className="border-t border-hairline bg-up-soft px-3.5 py-2 text-[11px] text-up">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
