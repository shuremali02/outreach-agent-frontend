"use client";

import { useSyncExternalStore } from "react";
import { useUserNames } from "@/hooks/use-users";
import type { Lead } from "@/types";

// No real external store to subscribe to -- `mounted` only ever flips once, right after hydration, and
// never changes again, so there is nothing to notify on.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/**
 * "👤 Added by Ali · Last touched by Sara" -- who put the lead in and who worked it last (auth-plan.md).
 * Nothing renders for a lead from before sign-in existed, or while login is off.
 *
 * `mounted` fixes a hydration mismatch found live 2026-09-23: useUsers() (hooks/use-users.ts) has no
 * server-fetched seed data, so its query cache is empty on the server AND on a brand-new client -- but
 * the QueryClient is created once and survives client-side navigation, so if the browser had already
 * visited another page that populated the ["users"] cache, a fresh server round-trip to THIS page
 * mismatches: server renders null (no cached names yet), client's first render already has them. Holding
 * off until after mount makes the client's first render null too, matching the server every time; the
 * real names then fill in a moment later like any other post-mount query update.
 *
 * useSyncExternalStore, not useEffect+setState (react-hooks/set-state-in-effect flagged that as a
 * cascading-render risk) -- same "different before/after hydration" pattern sidebar.tsx already uses for
 * its own collapsed state, just inlined here since there's no real store to read.
 */
export function LeadWho({ lead }: { lead: Lead }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const nameOf = useUserNames();
  const added = nameOf(lead.created_by_user_id);
  const touched = nameOf(lead.last_touched_by_user_id);
  if (!mounted || (!added && !touched)) return null;
  return (
    <>
      {added && ` · 👤 Added by ${added}`}
      {touched && touched !== added && ` · ✍️ Last touched by ${touched}`}
    </>
  );
}
