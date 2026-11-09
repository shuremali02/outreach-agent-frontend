import { TerminalTabs } from "@/components/terminal/terminal-tabs";
import { metricsApi } from "@/lib/api";

// See meetings/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  // Google Sheet fetch commented out 2026-11-07 (tab removed, so no point calling the sheet endpoint on
  // every page load). Restore together with the SHEET TAB blocks in terminal-tabs.tsx:
  // const [weeks, sheet] = await Promise.all([
  //   metricsApi.teamWeeks().catch(() => null),
  //   metricsApi.team().catch(() => null),
  // ]);
  // return <TerminalTabs weeks={weeks} sheet={sheet} />;
  const weeks = await metricsApi.teamWeeks().catch(() => null);
  return <TerminalTabs weeks={weeks} />;
}
