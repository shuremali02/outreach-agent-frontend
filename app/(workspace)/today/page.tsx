import { QuoteStrip } from "@/components/today/quote-strip";
import { SalesFloorTicker } from "@/components/today/sales-floor-ticker";
import { PriorityOutreachList } from "@/components/today/priority-outreach";
import { ProblemDesk } from "@/components/problems/problem-desk";
import { MetricCard } from "@/components/metrics/metric-card";
import { leadsApi, metricsApi } from "@/lib/api";
import { currency, num, todayEyebrow } from "@/lib/format";

export default async function TodayPage() {
  const [leads, metrics, team] = await Promise.all([
    leadsApi.list(),
    metricsApi.crm(),
    metricsApi.team(),
  ]);

  return (
    <div>
      <p className="date-eyebrow">{todayEyebrow()}</p>
      <QuoteStrip />

      <SalesFloorTicker total={team.total} />

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
