"use client";

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";

/**
 * A clock that ticks: the current time in ms, refreshed every 30 seconds and the moment the tab
 * becomes visible again. One shared timer serves every subscriber (a Cold Call queue can have
 * hundreds of local-time badges). null on the server and during hydration, so the server's
 * clock is never painted into the page.
 *
 * The PC's own clock can be a minute or two off, so the backend's clock (GET /time) is asked once
 * per page load and the difference is applied. If the backend has no /time (older deploy) or cannot
 * be reached, the PC clock is used as before.
 */
let offsetMs = 0;
let syncing = false;
let current = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

const now = () => Date.now() + offsetMs;

/** How far the PC clock is from the server's, using the middle of the request as "when" the server answered. */
async function syncClock() {
  if (syncing) return;
  syncing = true;
  try {
    const before = Date.now();
    const { now_ms } = await api.get<{ now_ms: number }>("/time");
    const after = Date.now();
    if (typeof now_ms === "number") {
      offsetMs = now_ms - (before + after) / 2;
      tick();
    }
  } catch {
    // No /time or no network: keep using the PC clock.
  }
}

function tick() {
  current = now();
  listeners.forEach((l) => l());
}
function onVisible() {
  if (document.visibilityState === "visible") tick();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    current = now();
    timer = setInterval(tick, 30_000);
    void syncClock();
    document.addEventListener("visibilitychange", onVisible);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => current || now(),
    () => null,
  );
}
