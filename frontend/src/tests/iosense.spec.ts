import { expect, test } from "@playwright/test";
import { __testing, type ChannelRequest } from "../services/iosense/widget-data";
import { describeCoverage, type PlantBindings } from "../services/iosense/bindings";
import type { WidgetDataBuckets } from "../services/iosense/types";

const { planEntries, accumulate, combine } = __testing;

/**
 * The connector has no consumption operator, so `last − first` on a cumulative
 * register is synthesised locally as `max − min`. These pin that arithmetic
 * and the bucket fold, which are the parts that would silently produce wrong
 * kWh figures if they drifted.
 */

/** Builds the nested timeFrame → bucket → rows shape the connector returns. */
function buckets(rows: Record<string, (number | string | null)[]>): WidgetDataBuckets {
  const byBucket: Record<string, { key: string; data: number | string | null; type: "device"; operator: string }[]> = {};
  const depth = Math.max(...Object.values(rows).map((values) => values.length));

  for (let index = 0; index < depth; index += 1) {
    const label = `2026-09-0${index + 1}`;
    byBucket[label] = Object.entries(rows)
      .filter(([, values]) => values[index] !== undefined)
      .map(([key, values]) => ({
        key,
        data: values[index],
        type: "device" as const,
        operator: "sum",
      }));
  }
  return { day: byBucket };
}

test.describe("consumption operator", () => {
  test("expands into a min and a max connector entry", () => {
    const channels: ChannelRequest[] = [
      {
        id: "node:plant:kwh",
        source: { type: "device", devID: "KNBWEM_Z1", sensor: "D30" },
        operator: "consumption",
      },
    ];
    const { entries, planned } = planEntries(channels);

    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.operator).sort()).toEqual(["max", "min"]);
    expect(entries.every((e) => e.devID === "KNBWEM_Z1" && e.sensor === "D30")).toBe(true);
    expect(planned.map((p) => p.role).sort()).toEqual(["max", "min"]);
    expect(planned.every((p) => p.channelId === "node:plant:kwh")).toBe(true);
  });

  test("reads as last minus first across the window's buckets", () => {
    const channels: ChannelRequest[] = [
      {
        id: "plant",
        source: { type: "device", devID: "KNBWEM_Z1", sensor: "D30" },
        operator: "consumption",
      },
    ];
    const { planned } = planEntries(channels);
    const [minKey, maxKey] = planned.map((p) => p.key);

    // A climbing register: 1,000 → 1,450 over three days.
    const acc = new Map();
    accumulate(
      buckets({
        [minKey]: [1000, 1180, 1310],
        [maxKey]: [1175, 1305, 1450],
      }),
      acc,
    );

    expect(combine(planned, acc).get("plant")).toBe(450);
  });

  test("a single-bucket window still yields the register delta", () => {
    const { planned } = planEntries([
      { id: "plant", source: { type: "device", devID: "M", sensor: "D30" }, operator: "consumption" },
    ]);
    const [minKey, maxKey] = planned.map((p) => p.key);
    const acc = new Map();
    accumulate(buckets({ [minKey]: [8000], [maxKey]: [8042.5] }), acc);
    expect(combine(planned, acc).get("plant")).toBeCloseTo(42.5, 6);
  });

  test("a missing leg yields null rather than a bogus zero", () => {
    const { planned } = planEntries([
      { id: "plant", source: { type: "device", devID: "M", sensor: "D30" }, operator: "consumption" },
    ]);
    const [minKey] = planned.map((p) => p.key);
    const acc = new Map();
    accumulate(buckets({ [minKey]: [1000] }), acc);
    expect(combine(planned, acc).get("plant")).toBeNull();
  });

  test("non-numeric readings are treated as absent, not coerced to zero", () => {
    const { planned } = planEntries([
      { id: "kwh", source: { type: "device", devID: "M", sensor: "D1" }, operator: "sum" },
    ]);
    const [key] = planned.map((p) => p.key);
    const acc = new Map();
    accumulate(buckets({ [key]: ["120.5", null, "not-a-number", 30] }), acc);
    // Only the two parseable values contribute.
    expect(combine(planned, acc).get("kwh")).toBeCloseTo(150.5, 6);
  });
});

test.describe("bucket folding by operator", () => {
  test("sum adds across buckets, min and max do not", () => {
    const { planned } = planEntries([
      { id: "s", source: { type: "device", devID: "M", sensor: "D1" }, operator: "sum" },
      { id: "lo", source: { type: "device", devID: "M", sensor: "D1" }, operator: "min" },
      { id: "hi", source: { type: "device", devID: "M", sensor: "D1" }, operator: "max" },
      { id: "avg", source: { type: "device", devID: "M", sensor: "D1" }, operator: "mean" },
    ]);
    const keys = Object.fromEntries(planned.map((p) => [p.channelId, p.key]));

    const acc = new Map();
    accumulate(
      buckets({
        [keys.s]: [10, 20, 30],
        [keys.lo]: [4, 9, 2],
        [keys.hi]: [11, 25, 7],
        [keys.avg]: [10, 20, 30],
      }),
      acc,
    );

    const out = combine(planned, acc);
    expect(out.get("s")).toBe(60);
    expect(out.get("lo")).toBe(2);
    expect(out.get("hi")).toBe(25);
    expect(out.get("avg")).toBe(20);
  });

  test("a channel with no rows at all reads null", () => {
    const { planned } = planEntries([
      { id: "absent", source: { type: "device", devID: "M", sensor: "D9" }, operator: "sum" },
    ]);
    expect(combine(planned, new Map()).get("absent")).toBeNull();
  });
});

test.describe("binding coverage", () => {
  const equipmentIds = ["a", "b", "c"];

  test("the plant meter alone does not make the tree live", () => {
    const bindings: PlantBindings = {
      nodes: { plant: { energyKwh: { devID: "KNBWEM_Z1", sensor: "D30", operator: "consumption" } } },
      equipment: {},
    };
    const coverage = describeCoverage(bindings, equipmentIds);

    expect(coverage.meteredNodes).toEqual(["plant"]);
    expect(coverage.missingEquipment).toEqual(equipmentIds);
    // Partial coverage must not go live — mixed real and zeroed rows would
    // corrupt the roll-ups and the top-contributor ranking.
    expect(coverage.complete).toBe(false);
  });

  test("coverage completes once every machine is bound", () => {
    const bindings: PlantBindings = {
      nodes: {},
      equipment: Object.fromEntries(
        equipmentIds.map((id) => [id, { energyKwh: { devID: `DEV_${id}`, sensor: "D30" } }]),
      ),
    };
    const coverage = describeCoverage(bindings, equipmentIds);
    expect(coverage.missingEquipment).toEqual([]);
    expect(coverage.complete).toBe(true);
  });

  test("an empty model never counts as complete", () => {
    expect(describeCoverage({ nodes: {}, equipment: {} }, []).complete).toBe(false);
  });
});
