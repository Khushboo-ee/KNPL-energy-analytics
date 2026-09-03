import { readIosenseConfig, type IosenseConfig } from "./config";
import type { ApiEnvelope } from "./types";

/**
 * Base fetch wrapper for the IOsense connector.
 *
 * Every call goes through here so the bearer token, the organisation header
 * and error handling exist in exactly one place. Server-side only — the token
 * must never cross into the browser bundle.
 */

/** Thrown for any non-success outcome, with enough context to diagnose it. */
export class IosenseError extends Error {
  constructor(
    message: string,
    readonly detail: {
      functionId: string;
      status?: number;
      cause?: unknown;
      errors?: string[];
    },
  ) {
    super(message);
    this.name = "IosenseError";
  }
}

/** Fails loudly rather than silently returning demo numbers. */
function requireConfig(functionId: string): IosenseConfig {
  const config = readIosenseConfig();
  if (!config) {
    throw new IosenseError(
      "IOsense is not configured. Set IOSENSE_API_BASE_URL and IOSENSE_API_TOKEN.",
      { functionId },
    );
  }
  return config;
}

function buildHeaders(config: IosenseConfig): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    "Content-Type": "application/json",
    // The connector sits behind an Angular service worker on some
    // deployments; this asks it not to serve a cached response.
    "ngsw-bypass": "true",
  };
  if (config.organisation) headers.organisation = config.organisation;
  return headers;
}

interface RequestOptions {
  /** For logging and error attribution — the SDK's functionId. */
  functionId: string;
  method: "GET" | "PUT" | "POST";
  /** Path below the base URL, with a leading slash. */
  path: string;
  body?: unknown;
  /** Abort after this many milliseconds. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Performs one connector call and returns the whole parsed envelope.
 *
 * A transport failure, a non-2xx status, a non-JSON body and `success: false`
 * are all surfaced as `IosenseError` — the caller decides how to present it.
 *
 * Use this when the endpoint puts meaningful fields alongside `data`
 * (`getWidgetData` returns `comparisonData` as a sibling). For the common case
 * where only `data` matters, use `iosenseRequest`.
 */
export async function iosenseRequestEnvelope<E>({
  functionId,
  method,
  path,
  body,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RequestOptions): Promise<E> {
  const config = requireConfig(functionId);
  const url = `${config.baseUrl}${path}`;

  // Node's fetch has no default timeout; without this a hung connector would
  // hang the request handler indefinitely.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: buildHeaders(config),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      // Readings are period-scoped and must never be served stale.
      cache: "no-store",
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === "AbortError";
    throw new IosenseError(
      aborted
        ? `${functionId} timed out after ${timeoutMs}ms`
        : `${functionId} could not reach ${config.baseUrl}`,
      { functionId, cause },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new IosenseError(`${functionId} returned HTTP ${response.status}`, {
      functionId,
      status: response.status,
    });
  }

  let payload: E & ApiEnvelope<unknown>;
  try {
    payload = (await response.json()) as E & ApiEnvelope<unknown>;
  } catch (cause) {
    throw new IosenseError(`${functionId} returned a non-JSON body`, {
      functionId,
      status: response.status,
      cause,
    });
  }

  if (payload?.success === false) {
    throw new IosenseError(payload.message ?? `${functionId} reported success: false`, {
      functionId,
      status: response.status,
      errors: payload.errors,
    });
  }

  return payload;
}

/**
 * The common case: unwraps the envelope and hands back just `data`.
 */
export async function iosenseRequest<T>(options: RequestOptions): Promise<T> {
  const envelope = await iosenseRequestEnvelope<ApiEnvelope<T>>(options);
  return envelope.data;
}
