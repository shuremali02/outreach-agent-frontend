"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Replaces st.expander for lead rows on Today / Pipeline / Contacts. */
export function LeadCard({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      className={cn(
        "mb-3 overflow-hidden rounded-[10px] border bg-card transition-colors",
        open ? "border-accent" : "border-border hover:border-accent",
      )}
    >
      <Collapsible.Trigger className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
        <span className="text-[0.8rem] text-muted" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <span className="min-w-0 flex-1">{summary}</span>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div className="border-t border-border px-4 py-4">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
