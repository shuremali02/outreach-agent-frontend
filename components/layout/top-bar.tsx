"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NAV_ITEMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddLeadPopover } from "./add-lead-popover";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

/** Routes where a global search actually filters something. */
const SEARCHABLE = ["/pipeline", "/contacts", "/cold-call", "/projects"];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  // On every page (this bar is shared across the whole workspace layout) --
  // reps were reloading the entire browser tab just to see new data another
  // rep/job had already written to the DB. React Query already holds
  // everything cached client-side; invalidating with no key filter marks
  // every active query stale and refetches it, same end result as a full
  // reload but without losing scroll position, open cards, or in-progress
  // form fields elsewhere on the page.
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
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
    <div className="flex items-center gap-4 border-b border-border px-8 py-3">
      <p className="text-[0.78rem] tracking-wider text-muted">
        WORKSPACE / <span className="font-bold text-text">{current.toUpperCase()}</span>
      </p>

      <div className="ml-auto flex items-center gap-3">
        {canSearch && (
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, contact, email…"
            aria-label="Search leads"
            className="w-72"
          />
        )}
        <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "⏳ Refreshing…" : "🔄 Refresh"}
        </Button>
        <AddLeadPopover />
        <NotificationBell />
        <UserMenu />
      </div>
    </div>
  );
}
