import { expect, test, type Page } from "@playwright/test";
import {
  collectPageErrors,
  deltaKwhOf,
  parseNumber,
  realErrors,
  rowsAtDepth,
} from "./helpers";

const SHOTS = "test-results/screenshots";

async function open(page: Page) {
  const errors = collectPageErrors(page);
  await page.goto("/");
  await expect(page.getByTestId("hierarchy-table")).toBeVisible();
  return errors;
}

test.describe("EMS Analytics dashboard", () => {
  test("loads the plant view without console errors", async ({ page }) => {
    const errors = await open(page);

    await expect(
      page.getByRole("heading", { name: /EMS Analytics/ }),
    ).toBeVisible();
    await expect(page.getByText("Bawal Plant").first()).toBeVisible();

    for (const card of ["consumption", "delta", "contributor", "spc"]) {
      await expect(page.getByTestId(`kpi-${card}`)).toBeVisible();
    }

    await page.screenshot({ path: `${SHOTS}/01-dashboard.png`, fullPage: true });
    expect(realErrors(errors)).toEqual([]);
  });

  test("KPI cards report real, reconcilable figures", async ({ page }) => {
    await open(page);

    const consumption = await page.getByTestId("kpi-consumption").innerText();
    expect(consumption).toMatch(/kWh/);
    // Headline consumption is a real number, not a placeholder.
    expect(consumption).toMatch(/\d/);

    const deltaCard = page.getByTestId("kpi-delta");
    await expect(deltaCard).toContainText("%");

    // The Δ card must agree with the plant row's own Δ kWh column.
    const plantRowDelta = await deltaKwhOf(page.getByTestId("row-plant"));
    const cardDelta = parseNumber(
      (await deltaCard.locator("p").first().innerText()).replace("kWh", ""),
    );
    expect(cardDelta).not.toBeNull();
    expect(Math.abs((cardDelta as number) - (plantRowDelta as number))).toBeLessThan(1);

    // The top contributor names a real section, and that section's own row
    // must show the same positive Δ kWh the card claims.
    const contributor = page.getByTestId("kpi-contributor");
    const name = (await contributor.locator("p").first().innerText()).trim();
    expect(name).not.toBe("—");

    const contributorRow = page
      .locator('tr[data-depth="1"]')
      .filter({ hasText: name })
      .first();
    await expect(contributorRow).toBeVisible();

    const rowDelta = await deltaKwhOf(contributorRow);
    expect(rowDelta).not.toBeNull();
    expect(rowDelta as number).toBeGreaterThan(0);

    const cardContributorDelta = parseNumber(
      (await contributor.locator("p").nth(1).innerText()).split("kWh")[0],
    );
    expect(Math.abs((cardContributorDelta as number) - (rowDelta as number))).toBeLessThan(1);

    // It is also the largest positive mover among the sections.
    const sectionRows = page.locator('tr[data-depth="1"]');
    for (let index = 0; index < (await sectionRows.count()); index += 1) {
      const value = await deltaKwhOf(sectionRows.nth(index));
      if (value !== null) expect(value).toBeLessThanOrEqual(rowDelta as number);
    }
  });

  test("root is expanded, sections start collapsed", async ({ page }) => {
    await open(page);

    const root = page.getByTestId("row-plant");
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute("data-expanded", "true");
    // Seven sections beneath the plant.
    await expect(rowsAtDepth(page, 1)).toHaveCount(7);
    // None of them are open yet, so no subsections are on screen.
    await expect(rowsAtDepth(page, 2)).toHaveCount(0);
  });

  test("children are ranked by absolute Δ kWh at every level", async ({ page }) => {
    await open(page);

    const readDeltas = async (depth: number) => {
      const rows = rowsAtDepth(page, depth);
      const values: number[] = [];
      for (let index = 0; index < (await rows.count()); index += 1) {
        const value = await deltaKwhOf(rows.nth(index));
        if (value !== null) values.push(Math.abs(value));
      }
      return values;
    };

    const sections = await readDeltas(1);
    expect(sections.length).toBe(7);
    expect(sections).toEqual([...sections].sort((a, b) => b - a));

    // Drill into the first section and check the same holds one level down.
    await rowsAtDepth(page, 1).first().click();
    await expect(rowsAtDepth(page, 2).first()).toBeVisible();
    const subsections = await readDeltas(2);
    expect(subsections.length).toBeGreaterThan(1);
    expect(subsections).toEqual([...subsections].sort((a, b) => b - a));
  });

  test("clicking a row drills plant → section → subsection", async ({ page }) => {
    const errors = await open(page);

    // The largest mover is the first section row — the trace starts there.
    const topSection = rowsAtDepth(page, 1).first();
    const sectionName = await topSection.locator("th").innerText();
    await topSection.click();

    await expect(topSection).toHaveAttribute("data-expanded", "true");
    const subsections = rowsAtDepth(page, 2);
    await expect(subsections.first()).toBeVisible();

    // Indentation increases with depth.
    const sectionPad = await topSection
      .locator("th")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
    const subsectionPad = await subsections
      .first()
      .locator("th")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));
    expect(subsectionPad).toBeGreaterThan(sectionPad);

    await page.screenshot({ path: `${SHOTS}/02-drilldown.png`, fullPage: true });

    // And collapsing puts it back.
    await topSection.click();
    await expect(rowsAtDepth(page, 2)).toHaveCount(0);
    expect(sectionName.length).toBeGreaterThan(0);
    expect(realErrors(errors)).toEqual([]);
  });

  test("View equipment opens a machine table inline, with load badges", async ({
    page,
  }) => {
    const errors = await open(page);

    await page.getByTestId("row-paint-plant").click();

    // The deepest level offers a pill rather than a chevron — clicking it opens
    // the machines in place.
    const pill = page.getByTestId("view-equipment-paint-grinding");
    await expect(pill).toBeVisible();
    await expect(pill).toHaveText("View equipment");
    await pill.click();
    await expect(pill).toHaveText("Hide equipment");

    const chiller = page.getByTestId("equipment-row-pg-ch2");
    await expect(chiller).toBeVisible();

    // Still one page — no navigation happened.
    expect(new URL(page.url()).pathname).toBe("/");

    // Ten equipment columns, as specified.
    const headers = page
      .locator("table")
      .nth(1)
      .locator("thead th");
    await expect(headers).toHaveCount(10);
    await expect(headers.nth(0)).toHaveText("Machine");
    await expect(headers.nth(7)).toHaveText("Marginal kW");
    await expect(headers.nth(9)).toHaveText("Marginal Load %");

    // The fouled chiller is the block's largest mover and reads as overload.
    await expect(chiller).toContainText("Chiller CH-2");
    await expect(chiller.locator("[data-status]")).toHaveAttribute(
      "data-status",
      "overload",
    );

    await page.screenshot({ path: `${SHOTS}/03-equipment.png`, fullPage: true });

    await pill.click();
    await expect(chiller).toBeHidden();
    expect(realErrors(errors)).toEqual([]);
  });

  test("idle-heavy and overload thresholds match the rendered percentages", async ({
    page,
  }) => {
    await open(page);
    await page.getByTestId("expand-all").click();

    // Open every equipment panel available at the deepest levels.
    const pills = page.locator('[data-testid^="view-equipment-"]');
    const count = await pills.count();
    expect(count).toBeGreaterThan(5);
    for (let index = 0; index < count; index += 1) {
      await pills.nth(index).click();
    }

    const badges = page.locator("[data-status]");
    const total = await badges.count();
    expect(total).toBeGreaterThan(30);

    for (let index = 0; index < total; index += 1) {
      const badge = badges.nth(index);
      const status = await badge.getAttribute("data-status");
      const shown = await badge.evaluate(
        (el) => el.parentElement?.querySelector("span")?.textContent ?? "",
      );
      const pct = parseNumber(shown);

      if (status === "unknown") {
        expect(pct).toBeNull();
        continue;
      }
      expect(pct).not.toBeNull();
      const value = pct as number;
      if (status === "idle-heavy") expect(value).toBeLessThan(40);
      else if (status === "overload") expect(value).toBeGreaterThan(105);
      else {
        expect(value).toBeGreaterThanOrEqual(40);
        expect(value).toBeLessThanOrEqual(105);
      }
    }

    await page.screenshot({ path: `${SHOTS}/04-expanded-all.png`, fullPage: true });
  });

  test("zero-production sections degrade to an em dash, never an error", async ({
    page,
  }) => {
    await open(page);

    for (const id of ["rnd", "rm", "utility"]) {
      const row = page.getByTestId(`row-${id}`);
      await expect(row).toBeVisible();
      // Δ % Production has a zero baseline for these sections.
      await expect(row.locator("td").nth(7)).toHaveText("—");
      // Production columns read 0.0 rather than blank or NaN.
      await expect(row.locator("td").nth(4)).toHaveText("0.0");
      await expect(row.locator("th")).toContainText("SPC — · no production");
      const text = await row.innerText();
      expect(text).not.toMatch(/NaN|Infinity|undefined/);
    }

    const page_text = await page.locator("body").innerText();
    expect(page_text).not.toMatch(/NaN|Infinity/);
  });
});

test.describe("duration selector", () => {
  test("presets change the comparison window and the figures", async ({ page }) => {
    const errors = await open(page);

    const monthly = await page.getByTestId("kpi-consumption").innerText();

    await page.getByTestId("duration-trigger").click();
    await expect(page.getByTestId("duration-panel")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/05-duration.png` });
    await page.getByTestId("preset-today").click();

    await expect(page.getByTestId("duration-panel")).toBeHidden();
    await expect(page.getByTestId("duration-trigger")).toContainText(
      "Today vs Yesterday",
    );

    const daily = await page.getByTestId("kpi-consumption").innerText();
    // A single day must consume far less than a month to date.
    expect(daily).not.toBe(monthly);

    await page.getByTestId("duration-trigger").click();
    await page.getByTestId("preset-week").click();
    await expect(page.getByTestId("duration-trigger")).toContainText(
      "This Week vs Last Week",
    );

    expect(realErrors(errors)).toEqual([]);
  });

  test("custom range sets the current and previous windows independently", async ({
    page,
  }) => {
    const errors = await open(page);

    await page.getByTestId("duration-trigger").click();
    await page.getByTestId("custom-current-start").fill("2026-06-10");
    await page.getByTestId("custom-current-end").fill("2026-06-20");
    await page.getByTestId("custom-previous-start").fill("2026-05-01");
    await page.getByTestId("custom-previous-end").fill("2026-05-11");
    await page.getByTestId("apply-custom").click();

    const trigger = page.getByTestId("duration-trigger");
    await expect(trigger).toContainText("Custom Range");
    await expect(trigger).toContainText("10 Jun 2026");
    await expect(trigger).toContainText("20 Jun 2026");
    await expect(trigger).toContainText("1 May 2026");
    await expect(trigger).toContainText("11 May 2026");

    // The KPI card echoes the chosen current window.
    await expect(page.getByTestId("kpi-consumption")).toContainText("10 Jun 2026");
    expect(realErrors(errors)).toEqual([]);
  });

  test("a reversed custom range is normalised rather than rejected", async ({
    page,
  }) => {
    await open(page);
    await page.getByTestId("duration-trigger").click();
    await page.getByTestId("custom-current-start").fill("2026-06-20");
    await page.getByTestId("custom-current-end").fill("2026-06-10");
    await page.getByTestId("custom-previous-start").fill("2026-05-11");
    await page.getByTestId("custom-previous-end").fill("2026-05-01");
    await page.getByTestId("apply-custom").click();

    await expect(page.getByTestId("kpi-consumption")).toContainText("10 Jun 2026");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/NaN|Infinity/);
  });
});

test.describe("report export", () => {
  test("downloads an .xlsx of the current view", async ({ page }) => {
    const errors = await open(page);
    await page.getByTestId("row-paint-plant").click();

    await page.getByTestId("download-trigger").click();
    await expect(page.getByTestId("download-menu")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/06-download-menu.png` });

    const download = page.waitForEvent("download");
    await page.getByTestId("download-xlsx").click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/^EMS-Analytics_Bawal-Plant_.*\.xlsx$/);
    const path = await file.path();
    expect(path).toBeTruthy();

    const { statSync, readFileSync } = await import("node:fs");
    expect(statSync(path as string).size).toBeGreaterThan(2000);
    // A real xlsx is a zip container — check the local file header magic.
    expect(readFileSync(path as string).subarray(0, 2).toString("latin1")).toBe("PK");

    expect(realErrors(errors)).toEqual([]);
  });

  test("downloads a .pdf of the current view", async ({ page }) => {
    const errors = await open(page);
    await page.getByTestId("expand-all").click();
    await page.getByTestId("view-equipment-utility").click();

    await page.getByTestId("download-trigger").click();
    const download = page.waitForEvent("download");
    await page.getByTestId("download-pdf").click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/^EMS-Analytics_Bawal-Plant_.*\.pdf$/);
    const path = await file.path();
    const { readFileSync, statSync } = await import("node:fs");
    expect(statSync(path as string).size).toBeGreaterThan(2000);
    expect(readFileSync(path as string).subarray(0, 5).toString("latin1")).toBe("%PDF-");

    expect(realErrors(errors)).toEqual([]);
  });

  test("the export follows what is expanded on screen", async ({ page }) => {
    await open(page);

    await page.getByTestId("download-trigger").click();
    // Collapsed: the plant row plus its seven sections.
    await expect(page.getByTestId("download-menu")).toContainText("8");
    await page.keyboard.press("Escape");

    await page.getByTestId("expand-all").click();
    await page.getByTestId("view-equipment-rnd").click();
    await page.getByTestId("download-trigger").click();
    await expect(page.getByTestId("download-menu")).toContainText("equipment rows");
  });
});
