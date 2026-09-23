import { QuoteStrip } from "@/components/today/quote-strip";
import { ActivityScroller } from "@/components/today/activity-scroller";
import { TeamTodayTable } from "@/components/today/team-today";
import { PriorityOutreachList } from "@/components/today/priority-outreach";
import { ProblemDesk } from "@/components/problems/problem-desk";
import { MetricCard } from "@/components/metrics/metric-card";
import { leadsApi, metricsApi } from "@/lib/api";
import { currency, num, todayEyebrow } from "@/lib/format";

// See meetings/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  // team_analytics' Google Sheet call stats moved out of this page --
  // SalesFloorTicker (kept, unused, in case it's wanted again) only ever had
  // 3-week blocks, never a "today" row, so it could never answer what this
  // page now needs. Sales Terminal (app/(workspace)/terminal/page.tsx) still
  // fetches metricsApi.team() on its own for the full historical view.
  const [leads, metrics, activity, teamToday] = await Promise.all([
    leadsApi.list(),
    metricsApi.crm(),
    metricsApi.activity(),
    // Older backend without the per-person endpoint: skip the table rather than break the page.
    metricsApi.teamToday().catch(() => null),
  ]);

  return (
    <div>
      <p className="date-eyebrow">{todayEyebrow()}</p>
      <QuoteStrip />

      <ActivityScroller data={activity} />

      {teamToday && <TeamTodayTable data={teamToday} />}

      <ProblemDesk />

      <div className="my-5 grid grid-cols-4 gap-4">
        <MetricCard
          label="Pipeline Value"
          value={currency(metrics.pipeline_value)}
          sub={`Across ${num(metrics.active_opportunities)} opportunities`}
        />
        <MetricCard
          label="Active Opportunities"
          value={num(metrics.active_opportunities)}
          sub={`${num(metrics.active_opportunities)} need attention`}
        />
        <MetricCard
          label="Won This Month"
          value={currency(metrics.won_this_month)}
          sub="Closed 3D/CGI projects"
        />
        <MetricCard
          label="Follow-ups Due"
          value={num(metrics.followups_due)}
          sub={metrics.followups_due > 0 ? "Ready for next touch" : "All caught up"}
        />
      </div>

      <h2 className="mb-3 text-[1.35rem] font-semibold">🎯 Priority Outreach Items</h2>
      <PriorityOutreachList initialLeads={leads} />
    </div>
  );
}
