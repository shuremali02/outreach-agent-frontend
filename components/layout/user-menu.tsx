"use client";

import { LogOut } from "lucide-react";
import { clearSession } from "@/lib/auth";
import { useSessionUser } from "@/hooks/use-session-user";
import { USER_MENU } from "@/lib/constants";

/**
 * Who is signed in + Sign out, in the top bar. Renders nothing when there is no session (login
 * switched off), so the app looks exactly as before until sign-in is enabled. The user is read
 * after mount (cookies are browser-only) so the server-rendered HTML matches the first client render.
 */
export function UserMenu() {
  const user = useSessionUser();
  if (!user) return null;

  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();
  function signOut() {
    clearSession();
    // A full page load on purpose: it drops every cached query and any in-memory state of the signed-out user.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-2 border-l border-border pl-3">
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[0.85rem] font-bold text-white">
          {initials}
        </span>
      )}
      <span className="max-w-[140px] truncate text-[0.9rem] font-semibold" title={user.email}>
        {user.name || user.email}
      </span>
      <button
        type="button"
        onClick={signOut}
        title={USER_MENU.signOut}
        aria-label={USER_MENU.signOut}
        className="cursor-pointer rounded-[8px] border border-border bg-card p-1.5 text-muted hover:border-accent hover:text-accent"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
