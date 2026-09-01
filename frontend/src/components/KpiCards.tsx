"use client";

import {
  currentSpc,
  deltaKwh,
  deltaPct,
  deltaPctKwh,
  previousSpc,
  shareOfIncrease,
  topContributor,
} from "@/lib/metrics";
import {
  formatCompactKwh,
  formatDeltaKwh,
  formatKwh,
  formatPct,
  formatRange,
  formatSpc,
  EM_DASH,
} from "@/lib/format";
import { energyTone, TONE_TEXT } from "@/lib/delta-style";
import type { DurationSelection, EnergyNode } from "@/lib/types";
import { DeltaValue } from "./DeltaValue";

interface CardProps {
  label: string;
  hint?: string;
  accent?: "teal" | "amber" | "plain";
  children: React.ReactNode;
  footer?: React.ReactNode;
  testId: string;
}

function Card({ label, hint, accent = "plain", children, footer, testId }: CardProps) {
  const accentBar =
    accent === "teal" ? "bg-teal" : accent === "amber" ? "bg-amber" : "bg-hairline";

  return (
    <article
      data-testid={testId}
      className="relative flex flex-col justify-between overflow-hidden rounded-lg border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(7,37,58,0.04)]"
    >
      <span className={`absolute inset-x-0 top-0 h-[3px] ${accentBar}`} aria-hidden />
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
            {label}
          </h2>
          {hint && <span className="num text-[10px] text-ink-faint">{hint}</span>}
        </div>
        <div className="mt-2.5">{children}</div>
      </div>
      {footer && (
        <div className="mt-3 border-t border-hairline pt-2 text-[11px] text-ink-muted">
          {footer}
        </div>
      )}
    </article>
  );
}

interface KpiCardsProps {
  plant: EnergyNode;
  duration: DurationSelection;
}

export function KpiCards({ plant, duration }: KpiCardsProps) {
  const delta = deltaKwh(plant);
  const deltaPctValue = deltaPctKwh(plant);
  const tone = energyTone(delta);

  const leader = topContributor(plant);
  const leaderShare = leader ? shareOfIncrease(leader, plant) : null;

  const spcNow = currentSpc(plant);
  const spcBefore = previousSpc(plant);
  const spcDelta =
    spcNow !== null && spcBefore !== null ? deltaPct(spcNow, spcBefore) : null;
  const spcTone = energyTone(
    spcNow !== null && spcBefore !== null ? spcNow - spcBefore : null,
  );

  return (
    <section
      aria-label="Plant summary"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <Card
        testId="kpi-consumption"
        label="Plant Consumption"
        hint="current"
        accent="teal"
        footer={
          <span>
            Previous <span className="num font-medium text-ink">{formatKwh(plant.previous_kwh)}</span> kWh
            {" · "}
            {formatRange(duration.previous.start, duration.previous.end)}
          </span>
        }
      >
        <p className="num text-[26px] leading-none font-semibold tracking-tight text-ink">
          {formatCompactKwh(plant.current_kwh)}
          <span className="ml-1.5 text-[13px] font-medium text-ink-muted">kWh</span>
        </p>
        <p className="num mt-1.5 text-[11px] text-ink-faint">
          {formatRange(duration.current.start, duration.current.end)}
        </p>
      </Card>

      <Card
        testId="kpi-delta"
        label="Δ vs Previous Period"
        hint="kWh"
        footer={
          <span>
            {tone === "up"
              ? "Consumption rose against the comparison window."
              : tone === "down"
                ? "Consumption fell against the comparison window."
                : "No measurable change against the comparison window."}
          </span>
        }
      >
        <p className={`num text-[26px] leading-none font-semibold tracking-tight ${TONE_TEXT[tone]}`}>
          {formatDeltaKwh(delta)}
          <span className="ml-1.5 text-[13px] font-medium opacity-70">kWh</span>
        </p>
        <p className="mt-1.5 text-[12px]">
          <DeltaValue text={formatPct(deltaPctValue)} tone={tone} strong />
          <span className="ml-1.5 text-ink-faint">vs previous</span>
        </p>
      </Card>

      <Card
        testId="kpi-contributor"
        label="Top Contributor Section"
        hint="largest Δ kWh"
        accent="amber"
        footer={
          leader ? (
            <span>
              {leaderShare !== null ? (
                <>
                  <span className="num font-medium text-ink">
                    {leaderShare.toFixed(0)}%
                  </span>{" "}
                  of the plant-wide increase
                </>
              ) : (
                "Largest single increase this period"
              )}
            </span>
          ) : (
            <span>Every section held or reduced consumption.</span>
          )
        }
      >
        {leader ? (
          <>
            <p className="truncate text-[20px] leading-tight font-semibold text-ink">
              {leader.name}
            </p>
            <p className="mt-1 text-[12px]">
              <DeltaValue text={`${formatDeltaKwh(deltaKwh(leader))} kWh`} tone="up" strong />
              <span className="mx-1.5 text-hairline">|</span>
              <DeltaValue text={formatPct(deltaPctKwh(leader))} tone="up" strong />
            </p>
          </>
        ) : (
          <>
            <p className="text-[20px] leading-tight font-semibold text-ink-muted">
              {EM_DASH}
            </p>
            <p className="mt-1 text-[12px] text-ink-faint">No section increased</p>
          </>
        )}
      </Card>

      <Card
        testId="kpi-spc"
        label="Plant-wide SPC"
        hint="kWh / KL"
        footer={
          <span>
            Previous{" "}
            <span className="num font-medium text-ink">{formatSpc(spcBefore)}</span>
            {spcDelta !== null && (
              <>
                {" · "}
                <DeltaValue text={formatPct(spcDelta)} tone={spcTone} />
              </>
            )}
          </span>
        }
      >
        <p className="num text-[26px] leading-none font-semibold tracking-tight text-ink">
          {formatSpc(spcNow)}
          <span className="ml-1.5 text-[13px] font-medium text-ink-muted">kWh/KL</span>
        </p>
        <p className="num mt-1.5 text-[11px] text-ink-faint">
          on {plant.current_production.toFixed(1)} KL produced
        </p>
      </Card>
    </section>
  );
}
