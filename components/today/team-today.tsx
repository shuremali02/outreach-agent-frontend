"use client";

import { useQuery } from "@tanstack/react-query";
import { TeamTable } from "@/components/team/team-table";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Skeleton } from "@/components/ui/skeleton";
import { metricsApi } from "@/lib/api";
import { TEAM_ACTIVITY } from "@/lib/constants";
import { withIcons } from "@/components/ui/emoji-icon";

/**
 * "Team, Today": a row per person for today's PKT sales day (2 PM to 2 AM), plus the team total. Fetched by the
 * browser (not the page's server fetch, which has no user identity): an admin gets everyone, a rep only their own
 * row (2026-11-13, per-user access -- the backend scopes it, see deps.team_scope).
 */
export function TeamTodayTable() {
  const isAdmin = useIsAdmin();
  const { data } = useQuery({
    queryKey: ["team-today"],
    queryFn: metricsApi.teamToday,
    refetchInterval: 60_000,
    // Refresh on coming back to the tab / opening the page too (2026-11-13), not only every 60 s: someone who just
    // booked a meeting then looks at Today sees it at once. Cheap -- the backend answers from a cache that every
    // write clears (app/services/stats_cache.py).
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  // A rep has their own numbers as tiles (ActivityScroller), so this per-person table would only repeat them.
  if (!isAdmin) return null;
  if (!data) {
    return (
      <section className="my-5">
        <Skeleton className="mb-2 h-6 w-40" />
        <Skeleton className="h-40 rounded-[12px]" />
      </section>
    );
  }
  const empty = data.total.calls === 0 && data.total.emails === 0 && data.total.leads_added === 0;
  return (
    <section className="my-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[1.2rem] font-semibold">{withIcons(TEAM_ACTIVITY.todayHeading)}</h2>
        <p className="text-[0.8rem] text-muted">{data.label}</p>
      </div>
      <TeamTable rows={data.rows} total={data.total} />
      {empty && <p className="mt-2 text-[0.85rem] text-muted">{withIcons(TEAM_ACTIVITY.noneYet)}</p>}
    </section>
  );
}
