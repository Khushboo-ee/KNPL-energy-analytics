import { Dashboard } from "@/components/Dashboard";
import { toIso } from "@/lib/periods";

// Period presets are relative to "now", so the page is rendered per request
// rather than frozen at build time.
export const dynamic = "force-dynamic";

export default function Page() {
  // Resolved once on the server and handed down, so the server and client
  // agree on today's date and hydration stays clean.
  return <Dashboard today={toIso(new Date())} />;
}
