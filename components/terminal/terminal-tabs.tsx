"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { WeeklyReport } from "@/components/team/weekly-report";
import { TabButton } from "@/components/common/tab-button";
import { TerminalView } from "@/components/terminal/terminal-view";
import { TEAM_ACTIVITY } from "@/lib/constants";
import type { TeamMetrics, TeamWeeks } from "@/types";

/**
 * Sales Terminal: the new CRM-backed Weekly Report first, the original Google Sheet history
 * (unchanged) in the second tab. Either data source may be missing (older backend / sheet down) --
 * that tab then says so instead of taking the whole page down.
 */
export function TerminalTabs({
  weeks,
  sheet,
}: {
  weeks: TeamWeeks | null;
  sheet: TeamMetrics | null;
}) {
  return (
    <Tabs.Root defaultValue={weeks ? "weekly" : "sheet"}>
      <Tabs.List className="mb-5 flex gap-2">
        <TabButton value="weekly">{TEAM_ACTIVITY.weeklyTab}</TabButton>
        <TabButton value="sheet">{TEAM_ACTIVITY.sheetTab}</TabButton>
      </Tabs.List>
      <Tabs.Content value="weekly">
        {weeks ? <WeeklyReport initialData={weeks} /> : <p className="text-muted">{TEAM_ACTIVITY.sheetUnavailable}</p>}
      </Tabs.Content>
      <Tabs.Content value="sheet">
        {sheet ? <TerminalView initialData={sheet} /> : <p className="text-muted">{TEAM_ACTIVITY.sheetUnavailable}</p>}
      </Tabs.Content>
    </Tabs.Root>
  );
}
