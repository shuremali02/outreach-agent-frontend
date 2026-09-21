import { TerminalTabs } from "@/components/terminal/terminal-tabs";
import { metricsApi } from "@/lib/api";

// See follow-ups/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  // Each source can fail on its own (Google Sheet down / older backend): show what loads.
  const [weeks, sheet] = await Promise.all([
    metricsApi.teamWeeks().catch(() => null),
    metricsApi.team().catch(() => null),
  ]);
  return <TerminalTabs weeks={weeks} sheet={sheet} />;
}
