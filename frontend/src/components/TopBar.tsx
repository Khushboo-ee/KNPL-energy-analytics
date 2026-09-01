"use client";

import { DownloadMenu } from "./DownloadMenu";
import { DurationSelector } from "./DurationSelector";
import { BoltIcon } from "./icons";
import type { VisibleRow } from "@/lib/tree";
import type { DurationSelection } from "@/lib/types";

interface TopBarProps {
  plantName: string;
  duration: DurationSelection;
  today: string;
  rows: readonly VisibleRow[];
  onDurationChange: (next: DurationSelection) => void;
}

export function TopBar({
  plantName,
  duration,
  today,
  rows,
  onDurationChange,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-900/60 bg-navy-700 text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber text-[18px] text-navy-900">
            <BoltIcon />
          </span>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight sm:text-base">
              EMS Analytics
              <span className="text-white/40"> — </span>
              <span className="text-white/85">{plantName}</span>
            </h1>
            <p className="text-[11px] text-white/55">
              Energy vs production · period-over-period
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
          <DurationSelector value={duration} today={today} onChange={onDurationChange} />
          <DownloadMenu
            rows={rows}
            duration={duration}
            today={today}
            plantName={plantName}
          />
        </div>
      </div>
    </header>
  );
}
