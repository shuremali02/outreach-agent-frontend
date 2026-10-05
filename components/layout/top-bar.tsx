"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddLeadPopover } from "./add-lead-popover";
import { NotificationBell } from "./notification-bell";
import { ThemeSwitch } from "./theme-switch";
import { UserMenu } from "./user-menu";
import { toggleMobileSidebar } from "./sidebar";

/** Routes where a global search actually filters something. Cold Call Desk moved its search box down
 * next to "Re-sort by local time" instead (user, 2026-09-23) -- not rendered up here any more. */
const SEARCHABLE = ["/pipeline", "/contacts", "/projects"];

/** Layout-wide queries the Refresh button must not touch: they are not "this page's data". */
const LAYOUT_QUERY_KEYS = new Set(["notifications", "notifications-count", "users", "auth-config", "status"]);

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  // On every page (this bar is shared across the whole workspace layout) --
  // reps were reloading the entire browser tab just to see new data another
  // rep/job had already written to the DB. React Query already holds
  // everything cached client-side; invalidating marks queries stale and
  // refetches the ones on screen, same end result as a full reload but
  // without losing scroll position, open cards, or in-progress form fields.
  // Only the CURRENT page's data: the layout's own background queries (bell,
  // users, session/status) are left alone -- the bell already polls itself --
  // and queries of other pages are only marked stale (nothing fetches for a
  // page nobody is looking at), so they refresh when that page is opened.
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({
        predicate: (query) => !LAYOUT_QUERY_KEYS.has(String(query.queryKey[0])),
      });
    } finally {
      setRefreshing(false);
    }
  }

  const current = NAV_ITEMS.find((n) => n.href === pathname)?.name ?? "Workspace";
  const canSearch = SEARCHABLE.includes(pathname);

  const urlQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);

  // Adjust state during render when the URL changes underneath us — React's
  // recommended alternative to syncing derived state inside an effect.
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setQ(urlQ);
  }

  // Always read the CURRENT searchParams when the debounce timer actually
  // fires, not whatever was captured when it was scheduled. Without this, a
  // filter change (e.g. the Stage dropdown) made during the 300ms window gets
  // silently overwritten by this effect rebuilding the URL from a stale
  // snapshot plus `q`.
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams; // after each render, never during it
  });

  // app.py threaded search_query into three filters but never assigned it —
  // this is that dead wiring, finished.
  useEffect(() => {
    if (!canSearch) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, canSearch, pathname]);

  return (
    <div className="border-b border-border px-4 py-3 sm:px-6 lg:px-8">
      {/* Row 1: hamburger + page title + bell + avatar on mobile; unchanged single-row layout at `sm:`
          and up (user mockup, 2026-10-05: "navbar ko double line me kar do" -- Refresh/search/+Add a Lead
          move down to row 2 below, mobile only). */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile/tablet only -- opens the off-canvas sidebar (components/layout/sidebar.tsx). Below `lg` the
            sidebar is off-screen by default, this is the only way to reach it there. */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          aria-label="Open menu"
          className="cursor-pointer text-text lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        {/* Mobile: a compact page name next to the hamburger (the mockup puts it here, replacing the old
            "hide it entirely on a phone" call). `sm:` and up: today's exact WORKSPACE / PAGE breadcrumb,
            unchanged. */}
        <p className="truncate text-[0.95rem] font-bold text-text sm:hidden">{current}</p>
        <p className="hidden text-[0.78rem] tracking-wider text-muted sm:block">
          WORKSPACE / <span className="font-bold text-text">{current.toUpperCase()}</span>
        </p>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {/* Hidden below `sm`: search and +Add a Lead move to row 2 on mobile. Refresh stays up here at
              every width (user, 2026-10-05: "refresh button ko upar he rakh dein, notification icon k
              sath") -- as a circular icon button below `sm`, the full text+icon button at `sm:` and up. */}
          {canSearch && (
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, contact, email, phone…"
              aria-label="Search leads"
              className="hidden sm:block sm:w-72"
            />
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-input text-text hover:border-accent disabled:pointer-events-none disabled:opacity-50 sm:hidden"
          >
            <RefreshCw className={cn("h-[18px] w-[18px]", refreshing && "animate-spin")} aria-hidden />
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="hidden sm:inline-flex"
          >
            {refreshing ? "⏳ Refreshing…" : "🔄 Refresh"}
          </Button>
          <div className="hidden sm:block">
            <AddLeadPopover />
          </div>
          {/* Below `lg` the theme toggle moves inside UserMenu's dropdown instead (user, 2026-10-02: "toggle
              bhi usi dropdown ka") -- this standalone copy is desktop-only now. */}
          <div className="hidden lg:block">
            <ThemeSwitch />
          </div>
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {/* Row 2: mobile only -- search (where applicable) + Add a Lead. Always a second row, even on pages
          without search, so the layout doesn't jump between single/double line from one page to the next. */}
      <div className="mt-2 flex items-center gap-2 sm:hidden">
        {canSearch ? (
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leads…"
              aria-label="Search leads"
              className="w-full pl-9"
            />
          </div>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <AddLeadPopover />
      </div>
    </div>
  );
}
