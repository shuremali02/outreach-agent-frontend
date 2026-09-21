"use client";

import { useUserNames } from "@/hooks/use-users";
import type { Lead } from "@/types";

/**
 * "👤 Added by Ali · Last touched by Sara" -- who put the lead in and who worked it last (auth-plan.md).
 * Nothing renders for a lead from before sign-in existed, or while login is off.
 */
export function LeadWho({ lead }: { lead: Lead }) {
  const nameOf = useUserNames();
  const added = nameOf(lead.created_by_user_id);
  const touched = nameOf(lead.last_touched_by_user_id);
  if (!added && !touched) return null;
  return (
    <>
      {added && ` · 👤 Added by ${added}`}
      {touched && touched !== added && ` · ✍️ Last touched by ${touched}`}
    </>
  );
}
