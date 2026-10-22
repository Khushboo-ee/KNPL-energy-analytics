#!/usr/bin/env bash
# EMS Analytics — Bawal Plant: one-click local start (macOS / Linux).
# Installs and builds on first run only, then serves on http://localhost:3101.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=3101

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org" >&2
  exit 1
fi
echo "Using Node: $(node -v)"

if [ ! -d node_modules ]; then
  echo "First run — installing dependencies. This takes a few minutes."
  npm ci || npm install
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "Building the dashboard. This takes about a minute."
  npm run build
fi

echo
echo "  EMS Analytics is starting on http://localhost:$PORT"
echo "  Leave this terminal open while presenting. Ctrl+C to stop."
echo
exec npx next start --port "$PORT"
