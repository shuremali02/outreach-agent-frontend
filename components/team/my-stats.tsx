import { ACTIVITY_SCROLLER, TEAM_ACTIVITY } from "@/lib/constants";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatKey = keyof typeof TEAM_ACTIVITY.columns;

/** The four numbers a rep cares about first, shown big. */
const HEADLINE: StatKey[] = ["calls", "connected", "meetings", "leads_added"];

/** Everything else, grouped into compact cards of label / value rows. */
const GROUPS: { title: string; keys: StatKey[] }[] = [
  { title: "Call breakdown", keys: ["voicemail", "receptionist", "decision_maker"] },
  { title: "Outcomes", keys: ["no_shows", "followups", "callbacks"] },
  { title: "Follow-ups", keys: ["callback_attempts", "email_attempts", "emails"] },
  { title: "Leads & numbers", keys: ["disconnected", "numbers_called", "numbers_good", "numbers_wrong"] },
];

// Each metric keeps the colour it already has on the admin's Today cards, so a number looks the same everywhere.
const COLOR: Record<string, string> = Object.fromEntries(ACTIVITY_SCROLLER.cards.map((c) => [c.key, c.color]));

/**
 * A rep's own numbers (My Report, Today) -- laid out as a small report card instead of the admin's wide,
 * sideways-scrolling table (user, 2026-11-13). Four headline numbers on top; below, compact grouped cards of
 * label / value rows, where a zero fades back so the numbers that moved stand out. Responsive, no horizontal
 * scroll. `stats` is any object carrying the counts (a team row or an activity window): a count it does not
 * have is simply not shown.
 */
export function MyStatsGrid({ stats, className }: { stats: object; className?: string }) {
  const values = stats as Record<string, unknown>;
  const get = (k: StatKey): number | null => (typeof values[k] === "number" ? (values[k] as number) : null);

  const calls = get("calls");
  const connected = get("connected");
  const connectRate = calls && connected !== null ? Math.round((connected / calls) * 100) : null;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {HEADLINE.map((k) => {
          const value = get(k);
          if (value === null) return null;
          const color = COLOR[k] ?? "var(--accent)";
          return (
            <div
              key={k}
              className="rounded-[12px] border border-border bg-card px-4 py-3"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
                {TEAM_ACTIVITY.columns[k]}
              </p>
              <p
                className="mt-0.5 text-[2.1rem] font-bold leading-none tabular-nums"
                style={{ color: value === 0 ? "var(--muted)" : color }}
              >
                {num(value)}
              </p>
              {k === "connected" && connectRate !== null && (
                <p className="mt-1.5 text-[0.75rem] text-muted">{connectRate}% of calls</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {GROUPS.map((group) => {
          const rows = group.keys.filter((k) => get(k) !== null);
          if (rows.length === 0) return null;
          return (
            <section key={group.title} className="rounded-[12px] border border-border bg-card px-4 py-3">
              <p className="metric-label !mb-1">{group.title}</p>
              <ul>
                {rows.map((k) => {
                  const value = get(k) as number;
                  return (
                    <li
                      key={k}
                      className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-[0.88rem]">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: value === 0 ? "var(--border)" : (COLOR[k] ?? "var(--accent)") }}
                          aria-hidden
                        />
                        <span className={cn("truncate", value === 0 ? "text-muted" : "text-text")}>
                          {TEAM_ACTIVITY.columns[k]}
                        </span>
                      </span>
                      <span className={cn("font-semibold tabular-nums", value === 0 ? "text-muted" : "text-text")}>
                        {num(value)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
