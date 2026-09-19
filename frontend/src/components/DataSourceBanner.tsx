import type { TreeSource } from "@/services/plant-tree";

interface DataSourceBannerProps {
  source: TreeSource;
  reason?: string;
  error?: string | null;
}

/**
 * States plainly where the numbers came from.
 *
 * An energy dashboard that silently shows demo figures is worse than one that
 * shows nothing: an operator would act on them. The simulated state is
 * therefore always announced, never inferred from a missing badge.
 */
export function DataSourceBanner({ source, reason, error }: DataSourceBannerProps) {
  if (error) {
    return (
      <div
        role="alert"
        data-testid="source-banner"
        data-source="error"
        className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-up/30 bg-up-soft px-3.5 py-2.5 text-[12px]"
      >
        <span className="font-semibold text-up">Live data unavailable</span>
        <span className="text-ink-muted">{error}</span>
        <span className="text-ink-faint">
          Figures below are simulated, not plant readings.
        </span>
      </div>
    );
  }

  if (source === "iosense") {
    return (
      <div
        data-testid="source-banner"
        data-source="iosense"
        className="mb-3 flex items-center gap-2 text-[11px] text-ink-muted"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-down" aria-hidden />
        <span>
          Live IOsense telemetry · readings aggregated per day and totalled over each
          window
        </span>
      </div>
    );
  }

  // The audience for this banner is whoever is looking at the screen — often
  // not the person who will wire up the meters. So it says what the figures
  // are, in plain language, and keeps the wiring diagnostics one hover away
  // (in `title`) rather than leading with a file path.
  return (
    <div
      role="status"
      data-testid="source-banner"
      data-source="simulation"
      title={reason}
      className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-amber/40 bg-amber-soft px-3.5 py-2.5 text-[12px]"
    >
      <span className="font-semibold text-navy-700">Demonstration data</span>
      <span className="text-ink-muted">
        Representative figures showing how the dashboard works — not plant readings.
      </span>
      <span className="text-ink-faint">
        Live telemetry appears here once meter mapping is complete.
      </span>
    </div>
  );
}
