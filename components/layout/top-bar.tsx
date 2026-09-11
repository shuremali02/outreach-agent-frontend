"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEMS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { AddLeadPopover } from "./add-lead-popover";

/** Routes where a global search actually filters something. */
const SEARCHABLE = ["/pipeline", "/contacts", "/cold-call"];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  searchParamsRef.current = searchParams;

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
        <AddLeadPopover />
      </div>
    </div>
  );
}
