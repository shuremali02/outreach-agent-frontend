import { MeetingsCalendar } from "@/components/meetings/meetings-calendar";
import { NeedsFollowUpList } from "@/components/meetings/needs-followup-list";
import { leadsApi, metricsApi } from "@/lib/api";

// See today/page.tsx -- no dynamic API here either, so this would fail
// `next build` the same way once that page's error is fixed.
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  // No stage filter -- the calendar shows every meeting ever booked, not
  // just ones still sitting in meeting_booked (see meetings-calendar.tsx).
  const [leads, status] = await Promise.all([leadsApi.list({}), metricsApi.status()]);

  return (
    <div>
      {/* No SectionHeader here (user, 2026-09-22: "yeh hata do meting tab ki heading humyn nhi rkhni").
          structure-plan.md Phase 5: the only surviving piece of the old Follow-ups page, above the
          calendar as confirmed. */}
      <NeedsFollowUpList initialLeads={leads} calendarLink={status.calendar_link} />
      <MeetingsCalendar initialLeads={leads} />
    </div>
  );
}
