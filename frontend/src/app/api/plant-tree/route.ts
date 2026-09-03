import { NextResponse } from "next/server";
import { orderPeriod } from "@/lib/periods";
import type { Period, PeriodPair } from "@/lib/types";
import { IosenseError } from "@/services/iosense/api";
import { resolvePlantTree } from "@/services/plant-tree";

/**
 * Serves the plant tree for a comparison window.
 *
 * This route exists so the IOsense bearer token stays in the server process:
 * the browser asks for a window, and the token, connector URL and device
 * bindings never leave the server.
 */

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Query params are user input; reject anything that is not an ISO date. */
function readPeriod(
  params: URLSearchParams,
  startKey: string,
  endKey: string,
): Period | null {
  const start = params.get(startKey);
  const end = params.get(endKey);
  if (!start || !end || !ISO_DATE.test(start) || !ISO_DATE.test(end)) return null;
  if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) return null;
  return orderPeriod({ start, end });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const current = readPeriod(params, "cs", "ce");
  const previous = readPeriod(params, "ps", "pe");
  const today = params.get("today");

  if (!current || !previous || !today || !ISO_DATE.test(today)) {
    return NextResponse.json(
      { error: "Expected ISO dates for cs, ce, ps, pe and today." },
      { status: 400 },
    );
  }

  const periods: PeriodPair = { current, previous };

  try {
    const result = await resolvePlantTree(periods, today);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const detail =
      cause instanceof IosenseError
        ? `${cause.message}${cause.detail.errors?.length ? ` (${cause.detail.errors.join("; ")})` : ""}`
        : "Unexpected error talking to IOsense.";
    console.error("[plant-tree] IOsense request failed:", cause);
    // Surface the failure instead of quietly substituting demo numbers.
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
