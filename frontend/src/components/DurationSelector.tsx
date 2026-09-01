"use client";

import { useState } from "react";
import { useDismissable } from "@/hooks/useDismissable";
import { formatRange } from "@/lib/format";
import { PRESETS, buildCustom, resolvePreset } from "@/lib/periods";
import type { DurationSelection, Period, PresetId } from "@/lib/types";
import { CalendarIcon, ChevronDown } from "./icons";

interface DurationSelectorProps {
  value: DurationSelection;
  today: string;
  onChange: (next: DurationSelection) => void;
}

function DateField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  testId: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
        {label}
      </span>
      <input
        type="date"
        value={value}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
        className="num w-full rounded-md border border-hairline bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
    </label>
  );
}

/**
 * Comparison-window picker: three length-matched presets plus a custom mode
 * where the current and previous windows are chosen independently, which is
 * what makes like-for-like comparisons (a shutdown week vs a normal week)
 * possible.
 */
export function DurationSelector({ value, today, onChange }: DurationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [draftCurrent, setDraftCurrent] = useState<Period>(value.current);
  const [draftPrevious, setDraftPrevious] = useState<Period>(value.previous);
  const ref = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  // Seed the custom fields from whatever window is active, so switching to a
  // custom range starts from the preset the user was already looking at.
  const togglePanel = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setDraftCurrent(value.current);
    setDraftPrevious(value.previous);
    setOpen(true);
  };

  const choosePreset = (preset: Exclude<PresetId, "custom">) => {
    onChange(resolvePreset(preset, today));
    setOpen(false);
  };

  const applyCustom = () => {
    onChange(buildCustom(draftCurrent, draftPrevious));
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="duration-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={togglePanel}
        className="flex w-full items-center gap-2.5 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-left transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 sm:w-auto"
      >
        <CalendarIcon className="text-[15px] text-white/70" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13px] font-semibold text-white">
            {value.label}
          </span>
          <span className="num truncate text-[11px] text-white/60">
            {formatRange(value.current.start, value.current.end)}
            {" vs "}
            {formatRange(value.previous.start, value.previous.end)}
          </span>
        </span>
        <ChevronDown
          className={`ml-auto text-[14px] text-white/60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select comparison period"
          data-testid="duration-panel"
          className="absolute right-0 z-50 mt-2 w-[min(92vw,26rem)] rounded-lg border border-hairline bg-white p-4 shadow-[0_16px_40px_-12px_rgba(7,37,58,0.35)]"
        >
          <p className="text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
            Presets
          </p>
          <div className="mt-2 grid gap-1.5">
            {PRESETS.map((preset) => {
              const active = value.preset === preset.id;
              const resolved = resolvePreset(preset.id, today);
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`preset-${preset.id}`}
                  onClick={() => choosePreset(preset.id)}
                  className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-amber bg-amber-soft"
                      : "border-hairline bg-white hover:border-teal/40 hover:bg-teal-soft/60"
                  }`}
                >
                  <span className="text-[13px] font-medium text-ink">{preset.label}</span>
                  <span className="num text-right text-[10px] leading-tight text-ink-muted">
                    {formatRange(resolved.current.start, resolved.current.end)}
                    <br />
                    vs {formatRange(resolved.previous.start, resolved.previous.end)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-hairline pt-3">
            <p className="text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
              Custom range
            </p>
            <p className="mt-1 text-[11px] text-ink-faint">
              Set the current and comparison windows independently.
            </p>

            <fieldset className="mt-2.5">
              <legend className="text-[11px] font-semibold text-teal">
                Current period
              </legend>
              <div className="mt-1.5 flex gap-2">
                <DateField
                  label="From"
                  testId="custom-current-start"
                  value={draftCurrent.start}
                  onChange={(start) => setDraftCurrent((p) => ({ ...p, start }))}
                />
                <DateField
                  label="To"
                  testId="custom-current-end"
                  value={draftCurrent.end}
                  onChange={(end) => setDraftCurrent((p) => ({ ...p, end }))}
                />
              </div>
            </fieldset>

            <fieldset className="mt-3">
              <legend className="text-[11px] font-semibold text-ink-muted">
                Previous period
              </legend>
              <div className="mt-1.5 flex gap-2">
                <DateField
                  label="From"
                  testId="custom-previous-start"
                  value={draftPrevious.start}
                  onChange={(start) => setDraftPrevious((p) => ({ ...p, start }))}
                />
                <DateField
                  label="To"
                  testId="custom-previous-end"
                  value={draftPrevious.end}
                  onChange={(end) => setDraftPrevious((p) => ({ ...p, end }))}
                />
              </div>
            </fieldset>

            <button
              type="button"
              data-testid="apply-custom"
              onClick={applyCustom}
              className="mt-3.5 w-full rounded-md bg-navy-700 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              Apply custom range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
