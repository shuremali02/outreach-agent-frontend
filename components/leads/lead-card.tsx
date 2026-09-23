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
 */
export function LeadCard({
  lead,
  summary,
  children,
  defaultOpen = false,
}: {
  lead: Lead;
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
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
        starred ? "border-2" : "border bg-card",
        !starred && (open ? "border-accent" : "border-border hover:border-accent"),
      )}
      style={starred ? { borderColor: "var(--info)", background: "var(--info-tint)" } : undefined}
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
      </div>
      <Collapsible.Content>
        <div className="border-t border-border px-4 py-4">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
