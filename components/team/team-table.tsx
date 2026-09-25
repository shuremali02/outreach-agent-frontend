import { TEAM_ACTIVITY } from "@/lib/constants";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TeamRow } from "@/types";
import { withIcons } from "@/components/ui/emoji-icon";

const COLS: (keyof typeof TEAM_ACTIVITY.columns)[] = [
  "calls", "connected", "voicemail", "receptionist", "decision_maker",
  "meetings", "followups", "emails", "leads_added", "disconnected",
];

function Avatar({ row }: { row: TeamRow }) {
  if (row.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.avatar_url} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full" />;
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tag text-[0.72rem] font-bold text-muted">
      {row.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * One row per person plus a Team total row -- shared by Today ("Team, Today") and the Sales Terminal's
 * Weekly Report so both read identically. Wide, so it scrolls sideways inside its own box on small screens.
 */
export function TeamTable({ rows, total }: { rows: TeamRow[]; total: TeamRow }) {
  const hasUnassigned = rows.some((r) => r.user_id === null);
  return (
    <div>
      <div className="overflow-x-auto rounded-[10px] border border-border bg-card">
        <table className="w-full min-w-[820px] border-collapse text-[0.9rem]">
          <thead>
            <tr className="border-b border-border text-left text-[0.72rem] uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">{withIcons(TEAM_ACTIVITY.person)}</th>
              {COLS.map((c) => (
                <th key={c} className="px-3 py-2 text-right font-semibold">
                  {withIcons(TEAM_ACTIVITY.columns[c])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows, total].map((r, i) => {
              const isTotal = i === rows.length;
              return (
                <tr
                  key={r.user_id ?? `row-${i}`}
                  className={cn("border-b border-border last:border-0", isTotal && "bg-tag font-bold")}
                >
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      {!isTotal && <Avatar row={r} />}
                      <span className={cn(r.user_id === null && !isTotal && "italic text-muted")}>{r.name}</span>
                    </span>
                  </td>
                  {COLS.map((c) => (
                    <td key={c} className="px-3 py-2 text-right tabular-nums">
                      {num(r[c])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasUnassigned && <p className="mt-1.5 text-[0.78rem] text-muted">{withIcons(TEAM_ACTIVITY.unassignedNote)}</p>}
    </div>
  );
}
