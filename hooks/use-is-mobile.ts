"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `lg` breakpoint: below 1024px the sidebar becomes a drawer, i.e. "phone / small tablet".
const QUERY = "(max-width: 1023px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** `false` on the server and during hydration (so markup matches), then the real value. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
