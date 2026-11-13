import { Suspense } from "react";
import { QuoteStrip } from "@/components/today/quote-strip";
import { MeetingReminderBanner } from "@/components/today/meeting-reminder-banner";
import { ActivityScroller } from "@/components/today/activity-scroller";
import { TeamTodayTable } from "@/components/today/team-today";
import { ProblemDesk } from "@/components/problems/problem-desk";
import { leadsApi } from "@/lib/api";
import { todayEyebrow } from "@/lib/format";

// See meetings/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default function TodayPage() {
  // team_analytics' Google Sheet call stats moved out of this page --
  // SalesFloorTicker (kept, unused, in case it's wanted again) only ever had
  // 3-week blocks, never a "today" row, so it could never answer what this
  // page now needs. Sales Terminal (app/(workspace)/terminal/page.tsx) still
  // fetches metricsApi.team() on its own for the full historical view.
  // The activity cards and the Team Today table are NOT fetched here any more: a server-side fetch carries only
  // the shared API key (no user identity), and an admin must get the whole team while a rep gets only their own
  // numbers (2026-11-13). Those two components fetch in the browser, with the signed-in user's token.

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

      {/* Only the banner needs the leads list, so only it waits; everything else on Today shows at once (2026-11-13). */}
      <Suspense fallback={null}>
        <ReminderBanner />
      </Suspense>

      <ActivityScroller />

      <TeamTodayTable />
    </div>
  );
}

async function ReminderBanner() {
  // Only the meetings about to start (the banner's 6-hour window), not every lead.
  const leads = await leadsApi.list({ scope: "reminders" });
  return <MeetingReminderBanner leads={leads} />;
}
