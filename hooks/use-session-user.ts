"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSessionUser, readUserCookie } from "@/lib/auth";
import type { AuthUser } from "@/types";

// The session cookie only changes through saveSession / clearSession, and both are followed by a full
// page navigation, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * Who is signed in, or null (nobody, or login is off). null on the server and during hydration, so the
 * server-rendered markup matches the first client render.
 */
export function useSessionUser(): AuthUser | null {
  const raw = useSyncExternalStore(subscribe, readUserCookie, () => "");
  return useMemo(() => parseSessionUser(raw), [raw]);
}
