/**
 * IOsense connection settings, resolved from the environment.
 *
 * None of these are `NEXT_PUBLIC_`, so Next.js will not inline them into the
 * client bundle — the token exists only in the server process. Anything that
 * reads this module must therefore run on the server (a route handler or a
 * server component), never in a `"use client"` file.
 */

export interface IosenseConfig {
  baseUrl: string;
  token: string;
  organisation: string | null;
  timezone: string;
}

export type DataSource = "iosense" | "simulation";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Returns the connection settings, or `null` when the deployment has not been
 * pointed at an IOsense instance yet.
 */
export function readIosenseConfig(): IosenseConfig | null {
  const baseUrl = process.env.IOSENSE_API_BASE_URL?.trim();
  const token = process.env.IOSENSE_API_TOKEN?.trim();

  if (!baseUrl || !token) return null;

  return {
    baseUrl: trimTrailingSlash(baseUrl),
    token,
    organisation: process.env.IOSENSE_ORGANISATION?.trim() || null,
    timezone: process.env.IOSENSE_TIMEZONE?.trim() || "Asia/Calcutta",
  };
}

/**
 * Which source this deployment should read from.
 *
 * `EMS_DATA_SOURCE=simulation` forces the built-in demo data even on a
 * configured instance, which is useful for demos and for the test suite.
 */
export function resolveDataSource(): DataSource {
  if (process.env.EMS_DATA_SOURCE?.trim().toLowerCase() === "simulation") {
    return "simulation";
  }
  return readIosenseConfig() ? "iosense" : "simulation";
}
