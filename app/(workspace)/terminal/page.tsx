import { TerminalTabs } from "@/components/terminal/terminal-tabs";

// See meetings/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

/**
 * Sales Terminal (admins) / My Report (everyone else). The weekly numbers are fetched by the BROWSER (see
 * WeeklyReport), not here: a server-side fetch uses the shared API key, which has no user identity, so the
 * backend could not tell an admin's whole-team report from a rep's own (2026-11-13, per-user access).
 */
export default function TerminalPage() {
  return <TerminalTabs />;
}
