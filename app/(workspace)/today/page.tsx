import { QuoteStrip } from "@/components/today/quote-strip";
import { MeetingReminderBanner } from "@/components/today/meeting-reminder-banner";
import { ActivityScroller } from "@/components/today/activity-scroller";
import { TeamTodayTable } from "@/components/today/team-today";
import { PriorityOutreachList } from "@/components/today/priority-outreach";
import { ProblemDesk } from "@/components/problems/problem-desk";
import { MetricCard } from "@/components/metrics/metric-card";
import { leadsApi, metricsApi } from "@/lib/api";
import { currency, num, todayEyebrow } from "@/lib/format";
import { Ico } from "@/components/ui/emoji-icon";

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
      {/* The date/quote stayed first (2026-10-14 correction, user: "upar in ki bohut heavy ya mixup lag
          rha... dates or woh line jo arahi likhi hoi hardcoded... isko manage kro") -- putting Priority
          Tracker literally above even these made the one-line date + quote land in an orphaned spot
          between it and the Meeting Reminder banner instead of framing the page. They're a one-line page
          header, not competing content, so Priority Tracker below them is still the first REAL thing read
          -- satisfies the boss's original "read this first" ask without the mid-page sandwich. */}
      <p className="date-eyebrow">{todayEyebrow()}</p>
      <QuoteStrip />

      {/* Personalized to just this person's @mentions (user relaying the boss, 2026-10-14: "jis ko
          mention kya jaye usy show hin... yeh sab sy pehle check krna hai") -- was 5th on this page,
          after Team Today, showing every open problem to everyone.
          mb-5 here (2026-10-14 follow-up, user: "yeh kuch zyada he ek sath bina gap k ho gaya hai") --
          ProblemDesk's own <section> carries no bottom margin (shared with /problems, where nothing
          follows it), so without this the Meeting Reminder banner right after it had zero breathing room.
          Matches the mb-5/my-5 rhythm MeetingReminderBanner and the metrics grid below already use. */}
      <div className="mb-5">
        <ProblemDesk mentionedMeOnly />
      </div>

      <MeetingReminderBanner leads={leads} />

      <ActivityScroller data={activity} />

      {teamToday && <TeamTodayTable data={teamToday} />}

      {/* Stayed at 4 columns (not 5, despite 5 cards) -- user, 2026-10-15, screenshot: "data bahir ja rha
          hai value k numbers card k" -- 5 narrower columns clipped a large value like "$29,590,500" past
          the card's edge. .metric-val's 2.1rem bold font-size is shared by every MetricCard in the app, so
          shrinking it site-wide to fit 5-up here risked breaking other pages; wrapping the 5th card
          (Callbacks) onto its own row at this width keeps every card exactly as wide as before. */}
      <div className="my-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        {/* Split out of Pipeline Value/Active Opportunities above (user, 2026-10-15: "ab pipeline me nhi
            count hon callbacks alag sy count hona chahiye ... ek diff card callbacks ka") -- same
            hasOpenCallback() leads as the new Callbacks page, no longer folded into Pipeline's numbers. */}
        <MetricCard
          label="Callbacks"
          value={currency(metrics.callback_value)}
          sub={`${num(metrics.callback_count)} scheduled`}
        />
      </div>

      <h2 className="mb-3 text-[1.35rem] font-semibold"><Ico e="🎯" /> Priority Outreach Items</h2>
      <PriorityOutreachList initialLeads={leads} />
    </div>
  );
}
