import {
  IDLE_HEAVY_BELOW_PCT,
  OVERLOAD_ABOVE_PCT,
} from "@/lib/metrics";
import { formatPlainPct } from "@/lib/format";
import type { LoadStatus } from "@/lib/types";

const STYLES: Record<LoadStatus, string> = {
  "idle-heavy": "bg-up-soft text-up ring-up/25",
  overload: "bg-up-soft text-up ring-up/25",
  normal: "bg-down-soft text-down ring-down/20",
  unknown: "bg-canvas text-ink-muted ring-hairline",
};

const LABELS: Record<LoadStatus, string> = {
  "idle-heavy": "Idle-heavy",
  overload: "Overload",
  normal: "Normal",
  unknown: "No Δ hrs",
};

const TITLES: Record<LoadStatus, string> = {
  "idle-heavy": `Marginal load below ${IDLE_HEAVY_BELOW_PCT}% of rating — the extra running hours were largely idle`,
  overload: `Marginal load above ${OVERLOAD_ABOVE_PCT}% of rating — drawing beyond nameplate on the added hours`,
  normal: `Marginal load within ${IDLE_HEAVY_BELOW_PCT}–${OVERLOAD_ABOVE_PCT}% of rating`,
  unknown: "Run hours did not change, so marginal load is undefined",
};

interface LoadBadgeProps {
  pct: number | null;
  status: LoadStatus;
}

/** Marginal load percentage with its threshold verdict. */
export function LoadBadge({ pct, status }: LoadBadgeProps) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5" title={TITLES[status]}>
      <span className="num font-medium">{formatPlainPct(pct)}</span>
      <span
        className={`inline-flex shrink-0 items-center rounded-[3px] px-1.5 py-[1px] text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset ${STYLES[status]}`}
        data-status={status}
      >
        {LABELS[status]}
      </span>
    </span>
  );
}
