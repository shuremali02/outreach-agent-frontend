"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useMounted } from "@/hooks/use-mounted";
import { useSessionUser } from "@/hooks/use-session-user";

/**
 * Is the signed-in person an admin (Sales Terminal, whole-team numbers)? This only decides what the UI SHOWS --
 * the backend refuses / scopes the data for a rep on its own (app/api/deps.py require_admin / team_scope).
 *
 * - Nobody signed in (login switched off, local dev): true -- the backend is then open too.
 * - A session that already carries `is_admin` (every login since this feature) answers at once.
 * - An older session (saved before the field existed) asks GET /auth/me once, no re-login needed; until
 *   that answers it counts as NOT admin, so admin-only things never flash up for a rep.
 */
export function useIsAdmin(): boolean {
  const mounted = useMounted();
  const user = useSessionUser();
  const needsLookup = mounted && Boolean(user) && user?.is_admin === undefined && Boolean(getToken());
  const { data } = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
    enabled: needsLookup,
    staleTime: 10 * 60_000,
    retry: false,
  });
  if (!user) return true;
  if (user.is_admin !== undefined) return user.is_admin;
  return data?.is_admin ?? false;
}
