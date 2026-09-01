import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this app; without it Turbopack walks up and
    // picks up an unrelated lockfile outside the repository.
    root: path.resolve(process.cwd()),
  },
  // `next dev` refuses to serve its chunks to a host it doesn't recognise, so
  // opening the dev server on the loopback IP (or from another device on the
  // LAN) leaves the page unhydrated. These are dev-only origins.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
