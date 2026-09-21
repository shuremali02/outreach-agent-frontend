"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

/** Active team members (id, name, photo). Cached for the session: it changes when someone new signs in. */
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: authApi.users,
    staleTime: 5 * 60_000,
    // Old backend / login off: the list is a nice-to-have, never worth an error screen.
    retry: false,
  });
}

/** id -> name lookup for "Added by ..." style labels. */
export function useUserNames(): (id: number | null | undefined) => string {
  const { data } = useUsers();
  const byId = new Map((data ?? []).map((u) => [u.id, u.name || u.email.split("@")[0]]));
  return (id) => {
    if (id == null) return "";
    return byId.get(id) ?? "";
  };
}
