import { TerminalView } from "@/components/terminal/terminal-view";
import { metricsApi } from "@/lib/api";

// See follow-ups/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default async function TerminalPage() {
  const team = await metricsApi.team();
  return <TerminalView initialData={team} />;
}
