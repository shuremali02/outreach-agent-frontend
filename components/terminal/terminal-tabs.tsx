"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { WeeklyReport } from "@/components/team/weekly-report";
import { TabButton } from "@/components/common/tab-button";
// Google Sheet history tab commented out 2026-11-07 (user: "us ki need nhi ha ab"). To bring it back,
// uncomment every "SHEET TAB" block here and in app/(workspace)/terminal/page.tsx.
// import { TerminalView } from "@/components/terminal/terminal-view";
import { TEAM_ACTIVITY } from "@/lib/constants";
import type { TeamWeeks } from "@/types";
// import type { TeamMetrics } from "@/types"; // SHEET TAB
import { withIcons } from "@/components/ui/emoji-icon";

/**
 * Sales Terminal: the CRM-backed Weekly Report. The original Google Sheet history tab is commented out
 * (2026-11-07) -- see the SHEET TAB blocks below.
 */
export function TerminalTabs({
  weeks,
  // sheet, // SHEET TAB
}: {
  weeks: TeamWeeks | null;
  // sheet: TeamMetrics | null; // SHEET TAB
}) {
  return (
    <Tabs.Root defaultValue="weekly">
      <Tabs.List className="mb-5 flex gap-2">
        <TabButton value="weekly">{withIcons(TEAM_ACTIVITY.weeklyTab)}</TabButton>
        {/* SHEET TAB
        <TabButton value="sheet">{withIcons(TEAM_ACTIVITY.sheetTab)}</TabButton>
        */}
      </Tabs.List>
      <Tabs.Content value="weekly">
        {weeks ? <WeeklyReport initialData={weeks} /> : <p className="text-muted">{withIcons(TEAM_ACTIVITY.sheetUnavailable)}</p>}
      </Tabs.Content>
      {/* SHEET TAB
      <Tabs.Content value="sheet">
        {sheet ? <TerminalView initialData={sheet} /> : <p className="text-muted">{withIcons(TEAM_ACTIVITY.sheetUnavailable)}</p>}
      </Tabs.Content>
      */}
    </Tabs.Root>
  );
}
