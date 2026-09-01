import { expect, test } from "@playwright/test";
import { collectPageErrors, realErrors } from "./helpers";

const SHOTS = "test-results/screenshots";

/**
 * Tablet-width behaviour: the page itself must never scroll sideways; the wide
 * numeric table scrolls inside its own container instead of breaking layout.
 */
test.describe("tablet layout", () => {
  test("the page does not scroll horizontally", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/");
    await expect(page.getByTestId("hierarchy-table")).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    // Allow a pixel of rounding, nothing more.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    await page.screenshot({ path: `${SHOTS}/07-tablet.png`, fullPage: true });
    expect(realErrors(errors)).toEqual([]);
  });

  test("the hierarchy table scrolls inside its own container", async ({ page }) => {
    await page.goto("/");
    const table = page.getByTestId("hierarchy-table");
    await expect(table).toBeVisible();

    const scroller = table.locator("xpath=..");
    const metrics = await scroller.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
    }));

    expect(metrics.overflowX).toBe("auto");
    // The table is wider than the viewport at this width, and can be scrolled.
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    await scroller.evaluate((el) => el.scrollTo({ left: 400 }));
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test("the KPI cards stack instead of squashing", async ({ page }) => {
    await page.goto("/");
    const cards = ["consumption", "delta", "contributor", "spc"];
    const boxes = [];
    for (const card of cards) {
      const box = await page.getByTestId(`kpi-${card}`).boundingBox();
      expect(box).not.toBeNull();
      boxes.push(box!);
    }
    // Two per row at tablet width — the third card starts a new row.
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
    for (const box of boxes) expect(box.width).toBeGreaterThan(240);
  });

  test("controls remain reachable and the tree still drills", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/");

    await page.getByTestId("duration-trigger").click();
    await expect(page.getByTestId("duration-panel")).toBeVisible();
    const panel = await page.getByTestId("duration-panel").boundingBox();
    const viewport = page.viewportSize()!;
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.keyboard.press("Escape");

    await page.getByTestId("row-paint-plant").click();
    await expect(page.getByTestId("row-paint-grinding")).toBeVisible();
    await page.getByTestId("view-equipment-paint-grinding").click();
    await expect(page.getByTestId("equipment-row-pg-ch2")).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/08-tablet-equipment.png`, fullPage: true });
    expect(realErrors(errors)).toEqual([]);
  });
});
