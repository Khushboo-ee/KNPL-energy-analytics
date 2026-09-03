import { iosenseRequestEnvelope } from "./api";
import { readIosenseConfig } from "./config";
import type {
  ConnectorOperator,
  WidgetDataBuckets,
  WidgetDataConfigEntry,
  WidgetDataResponse,
} from "./types";

/**
 * `getWidgetData` — the only connector function with operators and time
 * bucketing, and the only one that understands clusters and compute flows.
 *
 * Its `comparisonMode` returns the current and comparison windows in one round
 * trip, which is exactly the period-over-period shape this dashboard is built
 * on: a single call yields both halves of every delta.
 */

export const FUNCTION_ID = "getWidgetData";

/**
 * Operators this app asks for. `sum`, `min`, `max` and `mean` pass straight
 * through to the connector; `consumption` is synthesised here.
 */
export type ChannelOperator = ConnectorOperator | "consumption";

/** One measurement the dashboard wants reduced over each window. */
export interface ChannelRequest {
  /** Caller's identifier, echoed back on the totals. */
  id: string;
  source: Omit<WidgetDataConfigEntry, "key" | "operator">;
  operator?: ChannelOperator;
}

export interface ChannelTotals {
  /** Value over the current window, or `null` when the connector had no data. */
  current: number | null;
  /** Value over the comparison window. */
  previous: number | null;
}

/**
 * The connector returns aggregated values as strings on some deployments;
 * anything non-numeric is treated as absent rather than coerced to 0, so a gap
 * in telemetry never reads as a genuine zero.
 */
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** How a key's per-bucket values collapse into one window figure. */
type Reducer = "sum" | "min" | "max" | "mean";

interface PlannedEntry {
  key: string;
  channelId: string;
  /** `value` is a direct reading; `min`/`max` are the two legs of consumption. */
  role: "value" | "min" | "max";
  reducer: Reducer;
}

interface Accumulator {
  total: number;
  count: number;
  min: number;
  max: number;
  seen: boolean;
}

function emptyAccumulator(): Accumulator {
  return {
    total: 0,
    count: 0,
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
    seen: false,
  };
}

/**
 * Folds the nested timeFrame → bucket → rows structure into one accumulator
 * per key.
 *
 * The fold has to be operator-aware. Summing a `min` across day buckets would
 * be meaningless — the window minimum is the smallest bucket minimum, not
 * their total.
 */
function accumulate(
  buckets: WidgetDataBuckets | undefined,
  into: Map<string, Accumulator>,
): void {
  if (!buckets) return;

  for (const byBucket of Object.values(buckets)) {
    for (const rows of Object.values(byBucket)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const value = toNumber(row?.data);
        if (value === null) continue;

        const acc = into.get(row.key) ?? emptyAccumulator();
        acc.total += value;
        acc.count += 1;
        acc.min = Math.min(acc.min, value);
        acc.max = Math.max(acc.max, value);
        acc.seen = true;
        into.set(row.key, acc);
      }
    }
  }
}

function reduceAccumulator(acc: Accumulator | undefined, reducer: Reducer): number | null {
  if (!acc?.seen) return null;
  switch (reducer) {
    case "sum":
      return acc.total;
    case "min":
      return acc.min;
    case "max":
      return acc.max;
    case "mean":
      // Unweighted mean of the bucket values. Buckets are uniform days here,
      // so this matches a straight mean over the window.
      return acc.count === 0 ? null : acc.total / acc.count;
  }
}

/** The connector degrades on very large config arrays; send it in batches. */
const MAX_CONFIG_ENTRIES = 40;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface WindowPair {
  currentStartMs: number;
  currentEndMs: number;
  previousStartMs: number;
  previousEndMs: number;
}

/**
 * Expands each requested channel into the connector entries needed to answer it.
 *
 * A cumulative energy register answers "how much was consumed?" with
 * `last − first`. Because such a register only ever climbs, that is identical
 * to `max − min` over the window — which the connector *can* compute, in the
 * same call, for both windows at once. Reading the raw series just to subtract
 * its endpoints would cost a full month of points per meter for the same answer.
 *
 * The one case where the two differ is a register that resets or rolls over
 * mid-window: `max − min` then understates by the pre-reset climb. Meters that
 * roll over need a compute flow on the platform side instead.
 */
function planEntries(channels: readonly ChannelRequest[]): {
  entries: WidgetDataConfigEntry[];
  planned: PlannedEntry[];
} {
  const entries: WidgetDataConfigEntry[] = [];
  const planned: PlannedEntry[] = [];
  let index = 0;

  const push = (
    channel: ChannelRequest,
    operator: ConnectorOperator,
    role: PlannedEntry["role"],
  ) => {
    const key = `c${index++}`;
    entries.push({ ...channel.source, operator, key });
    planned.push({ key, channelId: channel.id, role, reducer: operator });
  };

  for (const channel of channels) {
    const operator = channel.operator ?? "sum";
    if (operator === "consumption") {
      push(channel, "min", "min");
      push(channel, "max", "max");
    } else {
      push(channel, operator, "value");
    }
  }

  return { entries, planned };
}

function combine(
  planned: readonly PlannedEntry[],
  accumulators: Map<string, Accumulator>,
): Map<string, number | null> {
  const byChannel = new Map<string, { value?: number | null; min?: number | null; max?: number | null }>();

  for (const entry of planned) {
    const value = reduceAccumulator(accumulators.get(entry.key), entry.reducer);
    const slot = byChannel.get(entry.channelId) ?? {};
    slot[entry.role] = value;
    byChannel.set(entry.channelId, slot);
  }

  const out = new Map<string, number | null>();
  for (const [channelId, slot] of byChannel) {
    if (slot.value !== undefined) {
      out.set(channelId, slot.value);
      continue;
    }
    const { min, max } = slot;
    out.set(
      channelId,
      min === null || min === undefined || max === null || max === undefined
        ? null
        : max - min,
    );
  }
  return out;
}

/**
 * Reduces every requested channel over both windows.
 *
 * Keys sent to the connector are short generated tokens (`c0`, `c1`, …) rather
 * than the caller's ids, because the caller's ids are free-form and the key
 * round-trips through a third-party payload. The mapping back is local.
 */
export async function fetchChannelTotals(
  channels: readonly ChannelRequest[],
  windows: WindowPair,
): Promise<Map<string, ChannelTotals>> {
  const results = new Map<string, ChannelTotals>();
  if (channels.length === 0) return results;

  const timezone = readIosenseConfig()?.timezone ?? "Asia/Calcutta";
  const { entries, planned } = planEntries(channels);

  const currentAcc = new Map<string, Accumulator>();
  const previousAcc = new Map<string, Accumulator>();

  for (const batch of chunk(entries, MAX_CONFIG_ENTRIES)) {
    const envelope = await iosenseRequestEnvelope<WidgetDataResponse>({
      functionId: FUNCTION_ID,
      method: "PUT",
      path: "/account/ioLensWidget/getWidgetData",
      body: {
        startTime: windows.currentStartMs,
        endTime: windows.currentEndMs,
        timezone,
        timeBucket: ["year", "month", "day"],
        timeFrame: "day",
        type: "combinedBarLineChartV2",
        cycleTime: "00:00",
        config: batch,
        comparisonMode: true,
        comparisonStartTime: windows.previousStartMs,
        comparisonEndTime: windows.previousEndMs,
      },
    });

    accumulate(envelope.data, currentAcc);
    accumulate(envelope.comparisonData, previousAcc);
  }

  const current = combine(planned, currentAcc);
  const previous = combine(planned, previousAcc);

  for (const channel of channels) {
    results.set(channel.id, {
      current: current.get(channel.id) ?? null,
      previous: previous.get(channel.id) ?? null,
    });
  }

  return results;
}

// Exported for unit tests — the fold and the consumption arithmetic are the
// parts most worth pinning down.
export const __testing = { planEntries, accumulate, combine, emptyAccumulator };
