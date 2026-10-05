"use client";

import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clearSession } from "@/lib/auth";
import { useSessionUser } from "@/hooks/use-session-user";
import { USER_MENU } from "@/lib/constants";
import { ThemeSwitch } from "./theme-switch";

/**
 * Who is signed in + Sign out, in the top bar. Renders nothing when there is no session (login
 * switched off), so the app looks exactly as before until sign-in is enabled. The user is read
 * after mount (cookies are browser-only) so the server-rendered HTML matches the first client render.
 *
 * Two layouts, CSS-toggled (no JS media query -- same `hidden lg:...` pattern the rest of this
 * responsive pass uses): at `lg` and up, today's exact inline avatar+name+sign-out row, unchanged. Below
 * `lg`, just the avatar (user, 2026-10-02, reacting to a mobile screenshot: "sirf bandy ka icon show krna
 * chahiye us pr dropdown hona chahiye then wahan name complete or logout button ho or toggle bhi usi
 * dropdown ka") -- clicking it opens a dropdown with the full name, the theme toggle (TopBar's own copy is
 * `hidden` below `lg` now, see top-bar.tsx), and Sign Out. Same outside-click/Escape-to-close pattern
 * notification-bell.tsx's dropdown already uses.
 */
export function UserMenu() {
  const user = useSessionUser();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!user) return null;

  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();
  function signOut() {
    clearSession();
    // A full page load on purpose: it drops every cached query and any in-memory state of the signed-out user.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  const avatar = user.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[0.85rem] font-bold text-white">
      {initials}
    </span>
  );

  return (
    <>
      <div className="hidden items-center gap-2 border-l border-border pl-3 lg:flex">
        {avatar}
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

      <div ref={boxRef} className="relative lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          aria-expanded={open}
          className="cursor-pointer"
        >
          {avatar}
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-[10px] border border-border bg-card p-3 shadow-lg">
            <p className="truncate text-[0.9rem] font-semibold" title={user.email}>
              {user.name || user.email}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[0.82rem] text-muted">Theme</span>
              <ThemeSwitch />
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-border bg-input py-1.5 text-[0.85rem] font-semibold text-text hover:border-accent hover:text-accent"
            >
              <LogOut className="h-4 w-4" aria-hidden /> {USER_MENU.signOut}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
