"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { Star } from "lucide-react";
import { useState } from "react";
import { useToggleStar } from "@/hooks/use-leads";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types";

/**
 * Replaces st.expander for lead rows on Today / Pipeline / Contacts / Cold Call Desk / Meetings /
 * Projects. Star toggle added 2026-09-23 (user request: "star mark kr dy... yeh sirf mark hai koi action
 * nhi... jese receptionist lagta hai") -- tag only, same as the Cold Call Desk's "Call picked by" row: no
 * stage change, no queue movement. A starred card gets a blue border/tint everywhere this component is
 * used; Pipeline additionally filters by it (see pipeline-view.tsx).
 *
 * `accent` (2026-10-14, Projects' own identity -- "yeh sab same he hoty ja rhy hain... project tab ki apni
 * pehchan honi chahiye"): optional. Full border + tint, exactly the STARRED treatment's own device below
 * (just success/warn/info/danger instead of always blue) -- not a new system primitive, and not a one-
 * sided "side-tab" accent bar either (a left-border-only version was tried first, live-tested, and visibly
 * clashed with the existing open-state "border-accent" orange highlight -- a two-tone border). Every
 * existing caller leaves it unset, so Today / Pipeline / Contacts / Cold Call Desk / Meetings render byte-
 * identical to before; only Projects passes "success" (every row here is a won deal). A starred card's own
 * blue border/tint still wins -- that's a live user action on this specific lead, a stronger signal than
 * "which tab are we on".
 */
const ACCENT_TINT: Record<string, string> = {
  success: "var(--success-tint)",
  warn: "var(--warn-tint)",
  info: "var(--info-tint)",
  danger: "var(--danger-tint)",
};

export function LeadCard({
  lead,
  summary,
  children,
  defaultOpen = false,
  accent,
  headerAction,
}: {
  lead: Lead;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: "success" | "warn" | "info" | "danger" | "accent";
  /** Rendered top-right of the header, OUTSIDE the Collapsible.Trigger so clicking it doesn't also
   * open/close the card (user, 2026-10-16: moved "Edit in Leads" here off Pipeline's proposal_sent
   * cards to make room for the new Email/Call Attempt trackers below). Optional -- every existing caller
   * leaves it unset and renders exactly as before. */
  headerAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggleStar = useToggleStar();
  const starred = Boolean(lead.starred_at);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "mb-3 overflow-hidden rounded-[10px] border transition-colors",
        starred || accent ? "border-2" : "border bg-card",
        !starred && !accent && (open ? "border-accent" : "border-border hover:border-accent"),
      )}
      style={
        starred
          ? { borderColor: "var(--info)", background: "var(--info-tint)" }
          : accent
            ? {
                borderColor: `var(--${accent})`,
                background: ACCENT_TINT[accent],
                // Lights up on expand -- var(--shadow-call) is the app's existing success-green glow
                // (the big Call button on Cold Call Desk), reused here since "success" is the only accent
                // Projects actually uses; a future warn/info/danger caller just won't get the glow.
                boxShadow: open && accent === "success" ? "var(--shadow-call)" : undefined,
              }
            : undefined
      }
    >
      <div className="flex w-full items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => toggleStar.mutate(lead.id)}
          disabled={toggleStar.isPending}
          aria-pressed={starred}
          aria-label={starred ? "Unstar this lead" : "Mark this lead as priority"}
          title={starred ? "Unstar this lead" : "Mark as priority"}
          className="shrink-0 cursor-pointer disabled:cursor-default"
        >
          <Star
            className="h-[18px] w-[18px]"
            style={{ color: starred ? "var(--info)" : "var(--muted)" }}
            fill={starred ? "var(--info)" : "none"}
            aria-hidden
          />
        </button>
        <Collapsible.Trigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
          <span className="text-[0.8rem] text-muted" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          <span className="min-w-0 flex-1">{summary}</span>
        </Collapsible.Trigger>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <Collapsible.Content>
        <div className="border-t border-border px-4 py-4">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
