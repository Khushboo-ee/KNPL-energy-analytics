import type { Locator, Page } from "@playwright/test";

/** Strips grouping separators and normalises the typographic minus sign. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[,\s%]/g, "").replace(/−/g, "-").trim();
  if (cleaned === "—" || cleaned === "") return null;
  const value = Number(cleaned.replace(/^\+/, ""));
  return Number.isFinite(value) ? value : null;
}

/** Reads the Δ kWh column (index 3) of a hierarchy row. */
export async function deltaKwhOf(row: Locator): Promise<number | null> {
  const cell = row.locator("td").nth(2); // td[0]=current, [1]=previous, [2]=Δ kWh
  return parseNumber((await cell.innerText()).trim());
}

/** Hierarchy rows at a given nesting depth, in display order. */
export function rowsAtDepth(page: Page, depth: number): Locator {
  return page.locator(`tr[data-depth="${depth}"]`);
}

/**
 * Collects console errors and uncaught exceptions for the life of the page.
 * Next.js dev emits a Fast Refresh notice on some navigations, which is noise
 * rather than an application error.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

export const IGNORABLE_ERROR = /favicon|Fast Refresh|ERR_ABORTED/i;

export function realErrors(errors: readonly string[]): string[] {
  return errors.filter((error) => !IGNORABLE_ERROR.test(error));
}
