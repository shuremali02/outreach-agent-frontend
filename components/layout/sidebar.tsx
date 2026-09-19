"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS, SIDEBAR_TOGGLE } from "@/lib/constants";
import { useMetrics } from "@/hooks/use-metrics";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { SystemStatusPanel } from "./system-status";
import type { CrmMetrics, SystemStatus } from "@/types";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="date-eyebrow !mb-2">{children}</p>;
}

export function Sidebar({
  initialMetrics,
  initialStatus,
}: {
  initialMetrics?: CrmMetrics;
  initialStatus?: SystemStatus;
}) {
  const pathname = usePathname();
  const { data: metrics } = useMetrics(initialMetrics);

  // Open/close, remembered across visits (per browser). Read after mount, not in the
  // initial state, so the server-rendered markup and the first client render match.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("elipse-sidebar") === "collapsed");
    } catch {
      /* storage blocked -- stays open, still works */
    }
  }, []);
  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("elipse-sidebar", next ? "collapsed" : "open");
      } catch {
        /* not persisted, still toggles */
      }
      return next;
    });
  }

  /** app.py only rendered counts for Cold Call/Problem/Follow-ups; Meetings'
   * badge (meetings_count) was added later per user request 2026-09-18, no
   * Streamlit counterpart. */
  function badgeFor(key: string | null): number | null {
    if (!key || !metrics) return null;
    const value = metrics[key as keyof CrmMetrics];
    return typeof value === "number" && value > 0 ? value : null;
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-sidebar py-4 transition-[width] duration-200",
        collapsed ? "w-[76px] px-2" : "w-[280px] px-4",
      )}
    >
      <div className={cn("mb-2 flex items-center", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? <span className="logo-oval" aria-hidden /> : <Logo />}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? SIDEBAR_TOGGLE.expand : SIDEBAR_TOGGLE.collapse}
          aria-expanded={!collapsed}
          title={collapsed ? SIDEBAR_TOGGLE.expand : SIDEBAR_TOGGLE.collapse}
          className={cn(
            "cursor-pointer rounded-[8px] border border-border bg-card p-2 text-muted hover:border-accent hover:text-accent",
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden /> : <PanelLeftClose className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const count = badgeFor(item.badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? `${item.name}${count !== null ? ` (${count})` : ""}` : undefined}
              className={cn(
                "relative rounded-[8px] border py-2 text-[0.88rem] font-semibold transition-colors",
                collapsed ? "px-0 text-center" : "px-3",
                active
                  ? "border-transparent bg-accent text-white"
                  : "border-border bg-card text-text hover:border-accent hover:text-accent",
              )}
            >
              <span aria-hidden className={collapsed ? "text-[1.15rem]" : "mr-2"}>
                {item.icon}
              </span>
              {!collapsed && item.name}
              {!collapsed && count !== null && ` (${count})`}
              {collapsed && count !== null && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-badge px-1 text-center text-[0.68rem] font-bold leading-[18px] text-white">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Preferences + System Status need the width; collapsed = navigation only. */}
      {!collapsed && (
        <>
          <hr className="my-5 border-border" />

          <Eyebrow>Preferences</Eyebrow>
          <ThemeToggle />

          <hr className="my-5 border-border" />

          <Eyebrow>System Status</Eyebrow>
          <SystemStatusPanel initialData={initialStatus} />
        </>
      )}
    </aside>
  );
}
