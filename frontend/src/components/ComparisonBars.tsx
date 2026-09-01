interface ComparisonBarsProps {
  current: number;
  previous: number;
  /** Largest value among sibling rows, so bars are comparable within a level. */
  scale: number;
  label: string;
}

/**
 * Two-track bar: teal for the current period over grey for the previous.
 *
 * Bars are scaled against the largest sibling at the same depth rather than
 * against the row's own maximum, so a row's bar length carries both its share
 * of the level and its movement against last period.
 */
export function ComparisonBars({ current, previous, scale, label }: ComparisonBarsProps) {
  const denominator = scale > 0 ? scale : Math.max(current, previous, 1);
  const currentPct = Math.max(0, Math.min(100, (current / denominator) * 100));
  const previousPct = Math.max(0, Math.min(100, (previous / denominator) * 100));

  return (
    <div
      className="flex min-w-[72px] flex-col gap-[3px]"
      role="img"
      aria-label={label}
      title={label}
    >
      <div className="h-[6px] w-full overflow-hidden rounded-[2px] bg-hairline/60">
        <div
          className="h-full rounded-[2px] bg-teal transition-[width] duration-300 ease-out"
          style={{ width: `${currentPct}%` }}
        />
      </div>
      <div className="h-[6px] w-full overflow-hidden rounded-[2px] bg-hairline/60">
        <div
          className="h-full rounded-[2px] bg-ink-faint/55 transition-[width] duration-300 ease-out"
          style={{ width: `${previousPct}%` }}
        />
      </div>
    </div>
  );
}
