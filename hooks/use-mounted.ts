"use client";

import { useSyncExternalStore } from "react";

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
 * `false` on the server and during the client's hydration render, `true` on every render after that.
 * Extracted 2026-09-23 from the fix for lead-who.tsx's hydration mismatch (a `useEffect`+`setState` there
 * was itself flagged by react-hooks/set-state-in-effect as a cascading-render risk) -- the same pattern
 * is needed anywhere a value seeded from a client-only cache (React Query's persistent QueryClient, which
 * survives client-side navigation and so can already hold a DIFFERENT value than a fresh server render
 * used, e.g. sidebar.tsx's badge counts) must render identically on the server and the client's first
 * paint, then safely pick up the real value right after mount.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
