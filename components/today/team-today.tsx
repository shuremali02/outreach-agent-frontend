import { TeamTable } from "@/components/team/team-table";
import { TEAM_ACTIVITY } from "@/lib/constants";
import type { TeamToday } from "@/types";
import { withIcons } from "@/components/ui/emoji-icon";

/** "Team, Today": a row per person for today's PKT sales day (2 PM to 2 AM), plus the team total. */
export function TeamTodayTable({ data }: { data: TeamToday }) {
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
