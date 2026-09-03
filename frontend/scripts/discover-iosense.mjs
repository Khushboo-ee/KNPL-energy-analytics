#!/usr/bin/env node
/**
 * Lists every device and sensor the configured token can see, so the
 * (devID, sensor) pairs in src/services/iosense/bindings.ts can be filled in.
 *
 * Run from the frontend directory, inside the network that can resolve the
 * connector host:
 *
 *   node scripts/discover-iosense.mjs
 *   node scripts/discover-iosense.mjs --search "chiller"
 *   node scripts/discover-iosense.mjs --json > devices.json
 *
 * Reads IOSENSE_API_BASE_URL / IOSENSE_API_TOKEN / IOSENSE_ORGANISATION from
 * .env.local. Nothing is written back; this is read-only.
 *
 * functionId: findUserDevices  (PUT /account/devices/{skip}/{limit})
 */

import { readFile } from "node:fs/promises";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Minimal .env parser — avoids a dependency for a one-off script. */
async function loadEnv(file = ".env.local") {
  try {
    const text = await readFile(file, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Fall through to whatever is already in the environment.
  }
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? true;
}

async function fetchPage(baseUrl, headers, page, search) {
  const response = await fetch(`${baseUrl}/account/devices/${page}/${PAGE_SIZE}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      search: search ? { all: [search] } : [],
      filter: [],
      order: "default",
      sort: "AtoZ",
    }),
  });

  if (!response.ok) {
    throw new Error(`findUserDevices returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.success === false) {
    throw new Error(payload?.message ?? "findUserDevices reported success: false");
  }
  // The devices array is nested at response.data.data, not response.data.
  return {
    devices: payload?.data?.data ?? [],
    total: payload?.data?.totalCount ?? 0,
  };
}

async function main() {
  await loadEnv();

  const baseUrl = (process.env.IOSENSE_API_BASE_URL ?? "").replace(/\/+$/, "");
  const token = process.env.IOSENSE_API_TOKEN ?? "";
  if (!baseUrl || !token) {
    console.error("Set IOSENSE_API_BASE_URL and IOSENSE_API_TOKEN in .env.local first.");
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "ngsw-bypass": "true",
  };
  if (process.env.IOSENSE_ORGANISATION) {
    headers.organisation = process.env.IOSENSE_ORGANISATION;
  }

  const search = typeof arg("search") === "string" ? arg("search") : null;
  const all = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { devices, total } = await fetchPage(baseUrl, headers, page, search);
    all.push(...devices);
    if (all.length >= total || devices.length === 0) break;
  }

  if (arg("json")) {
    console.log(JSON.stringify(all, null, 2));
    return;
  }

  console.log(`${all.length} device(s) visible to this token at ${baseUrl}\n`);
  for (const device of all) {
    const tags = device.tags?.length ? `  [${device.tags.join(", ")}]` : "";
    console.log(`${device.devID}  —  ${device.devName}  (${device.devTypeName})${tags}`);
    for (const sensor of device.sensors ?? []) {
      const unit = device.unitSelected?.[sensor.sensorId];
      console.log(`    ${sensor.sensorId.padEnd(6)} ${sensor.sensorName}${unit ? `  (${unit})` : ""}`);
    }
    console.log();
  }
  console.log("Map the ids you need into src/services/iosense/bindings.ts.");
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
