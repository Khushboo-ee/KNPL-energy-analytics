import { expect, test } from "@playwright/test";
import {
  byAbsDeltaKwhDesc,
  currentSpc,
  deltaKwh,
  deltaPct,
  deltaPctKwh,
  deltaPctProduction,
  deltaProduction,
  deltaRunHrs,
  loadStatus,
  marginalKw,
  marginalLoadPct,
  shareOfIncrease,
  topContributor,
} from "../lib/metrics";
import { precedingWindow, resolvePreset, lengthInDays } from "../lib/periods";
import { loadPlantTree } from "../services/energy-source";
import type { Equipment, EnergyNode } from "../lib/types";

/**
 * Formula-level checks. These run in Node without a browser — they guard the
 * arithmetic and the divide-by-zero guards that the whole dashboard rests on.
 */

function equipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "eq",
    name: "Machine",
    rated_kw: 100,
    current_kwh: 0,
    previous_kwh: 0,
    current_run_hrs: 0,
    previous_run_hrs: 0,
    ...overrides,
  };
}

function node(overrides: Partial<EnergyNode> = {}): EnergyNode {
  return {
    id: "n",
    name: "Node",
    depth: 1,
    current_kwh: 0,
    previous_kwh: 0,
    current_production: 0,
    previous_production: 0,
    ...overrides,
  };
}

test.describe("delta formulas", () => {
  test("energy delta and percentage follow the definition", () => {
    const n = node({ current_kwh: 1200, previous_kwh: 1000 });
    expect(deltaKwh(n)).toBe(200);
    expect(deltaPctKwh(n)).toBeCloseTo(20, 10);
  });

  test("a decrease carries a negative percentage", () => {
    const n = node({ current_kwh: 750, previous_kwh: 1000 });
    expect(deltaKwh(n)).toBe(-250);
    expect(deltaPctKwh(n)).toBeCloseTo(-25, 10);
  });

  test("a zero baseline yields null, never Infinity or NaN", () => {
    expect(deltaPct(500, 0)).toBeNull();
    expect(deltaPct(0, 0)).toBeNull();
    expect(deltaPctKwh(node({ current_kwh: 90, previous_kwh: 0 }))).toBeNull();
    expect(
      deltaPctProduction(node({ current_production: 12, previous_production: 0 })),
    ).toBeNull();
  });

  test("production delta follows the same definition", () => {
    const n = node({ current_production: 120.5, previous_production: 100 });
    expect(deltaProduction(n)).toBeCloseTo(20.5, 10);
    expect(deltaPctProduction(n)).toBeCloseTo(20.5, 10);
  });

  test("SPC is null for a non-producing block", () => {
    expect(currentSpc(node({ current_kwh: 8400, current_production: 0 }))).toBeNull();
    expect(currentSpc(node({ current_kwh: 8400, current_production: 60 }))).toBe(140);
  });
});

test.describe("equipment marginal load", () => {
  test("marginal kW is energy added per extra running hour", () => {
    const item = equipment({
      current_kwh: 2400,
      previous_kwh: 1800,
      current_run_hrs: 20,
      previous_run_hrs: 12,
    });
    expect(deltaRunHrs(item)).toBe(8);
    expect(marginalKw(item)).toBe(75); // 600 kWh / 8 h
    expect(marginalLoadPct(item)).toBe(75); // of a 100 kW rating
  });

  test("unchanged run hours make marginal load undefined", () => {
    const item = equipment({
      current_kwh: 2400,
      previous_kwh: 1800,
      current_run_hrs: 15,
      previous_run_hrs: 15,
    });
    expect(marginalKw(item)).toBeNull();
    expect(marginalLoadPct(item)).toBeNull();
    expect(loadStatus(marginalLoadPct(item))).toBe("unknown");
  });

  test("a zero rating cannot produce a load percentage", () => {
    const item = equipment({
      rated_kw: 0,
      current_kwh: 100,
      current_run_hrs: 5,
    });
    expect(marginalLoadPct(item)).toBeNull();
  });

  test("thresholds classify at 40% and 105%", () => {
    expect(loadStatus(39.9)).toBe("idle-heavy");
    expect(loadStatus(40)).toBe("normal");
    expect(loadStatus(105)).toBe("normal");
    expect(loadStatus(105.1)).toBe("overload");
    expect(loadStatus(null)).toBe("unknown");
  });
});

test.describe("ranking", () => {
  test("children rank by absolute energy delta, biggest first", () => {
    const children = [
      node({ id: "a", name: "A", current_kwh: 100, previous_kwh: 90 }), // +10
      node({ id: "b", name: "B", current_kwh: 100, previous_kwh: 400 }), // -300
      node({ id: "c", name: "C", current_kwh: 200, previous_kwh: 100 }), // +100
    ];
    expect(byAbsDeltaKwhDesc(children).map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  test("top contributor is the largest positive mover only", () => {
    const parent = node({
      id: "root",
      depth: 0,
      children: [
        node({ id: "a", name: "A", current_kwh: 100, previous_kwh: 90 }), // +10
        node({ id: "b", name: "B", current_kwh: 100, previous_kwh: 900 }), // -800
        node({ id: "c", name: "C", current_kwh: 300, previous_kwh: 100 }), // +200
      ],
    });
    expect(topContributor(parent)?.id).toBe("c");
    // 200 of the 210 kWh of total increase.
    expect(shareOfIncrease(parent.children![2], parent)).toBeCloseTo(95.238, 3);
  });

  test("top contributor is null when nothing increased", () => {
    const parent = node({
      id: "root",
      depth: 0,
      children: [node({ id: "a", name: "A", current_kwh: 50, previous_kwh: 100 })],
    });
    expect(topContributor(parent)).toBeNull();
  });
});

test.describe("comparison windows", () => {
  test("presets produce length-matched windows", () => {
    for (const preset of ["today", "week", "month"] as const) {
      const selection = resolvePreset(preset, "2026-08-29");
      expect(lengthInDays(selection.previous)).toBeLessThanOrEqual(
        lengthInDays(selection.current),
      );
      expect(selection.previous.end < selection.current.start).toBe(true);
    }
  });

  test("today compares against yesterday", () => {
    const selection = resolvePreset("today", "2026-08-29");
    expect(selection.current).toEqual({ start: "2026-08-29", end: "2026-08-29" });
    expect(selection.previous).toEqual({ start: "2026-08-28", end: "2026-08-28" });
  });

  test("month-to-date compares against the same span of the prior month", () => {
    const selection = resolvePreset("month", "2026-08-29");
    expect(selection.current).toEqual({ start: "2026-08-01", end: "2026-08-29" });
    expect(selection.previous).toEqual({ start: "2026-07-01", end: "2026-07-29" });
  });

  test("a short prior month is clamped, never overrun", () => {
    const selection = resolvePreset("month", "2026-03-31");
    expect(selection.previous).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  test("the preceding window is adjacent and equal in length", () => {
    const window = precedingWindow({ start: "2026-08-10", end: "2026-08-16" });
    expect(window).toEqual({ start: "2026-08-03", end: "2026-08-09" });
  });
});

test.describe("plant tree", () => {
  const periods = resolvePreset("month", "2026-08-29");
  const plant = loadPlantTree(periods, "2026-08-29");

  test("aggregates reconcile against the leaves below them", () => {
    const check = (n: EnergyNode) => {
      if (n.children?.length) {
        const kwh = n.children.reduce((s, c) => s + c.current_kwh, 0);
        const production = n.children.reduce((s, c) => s + c.current_production, 0);
        expect(n.current_kwh).toBeCloseTo(kwh, 1);
        expect(n.current_production).toBeCloseTo(production, 1);
        n.children.forEach(check);
      } else {
        const kwh = (n.equipment ?? []).reduce((s, e) => s + e.current_kwh, 0);
        expect(n.current_kwh).toBeCloseTo(kwh, 1);
      }
    };
    check(plant);
  });

  test("the same window always returns the same figures", () => {
    const again = loadPlantTree(periods, "2026-08-29");
    expect(again.current_kwh).toBe(plant.current_kwh);
    expect(again.previous_kwh).toBe(plant.previous_kwh);
  });

  test("R&D, RM and Utility book no production, so their SPC is undefined", () => {
    const nonProducing = ["rnd", "rm", "utility"];
    plant.children
      ?.filter((c) => nonProducing.includes(c.id))
      .forEach((c) => {
        expect(c.current_production).toBe(0);
        expect(c.previous_production).toBe(0);
        expect(currentSpc(c)).toBeNull();
        expect(deltaPctProduction(c)).toBeNull();
        expect(c.current_kwh).toBeGreaterThan(0);
      });
    expect(plant.children?.filter((c) => nonProducing.includes(c.id))).toHaveLength(3);
  });

  test("run hours never exceed the hours available in the window", () => {
    const hoursAvailable = lengthInDays(periods.current) * 24;
    const walk = (n: EnergyNode) => {
      (n.equipment ?? []).forEach((e) => {
        expect(e.current_run_hrs).toBeLessThanOrEqual(hoursAvailable);
        expect(e.current_run_hrs).toBeGreaterThan(0);
        expect(e.current_kwh).toBeGreaterThan(0);
      });
      (n.children ?? []).forEach(walk);
    };
    walk(plant);
  });
});
