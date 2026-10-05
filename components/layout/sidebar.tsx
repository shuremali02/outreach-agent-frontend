"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NAV_ITEMS, SIDEBAR_TOGGLE } from "@/lib/constants";
import { useMetrics } from "@/hooks/use-metrics";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "./logo";
import { SystemStatusPanel } from "./system-status";
import type { CrmMetrics, SystemStatus } from "@/types";
import { Ico } from "@/components/ui/emoji-icon";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="date-eyebrow !mb-2">{children}</p>;
}

const SIDEBAR_KEY = "elipse-sidebar";
const SIDEBAR_EVENT = "elipse-sidebar-change";
let sidebarMemory = false;

function subscribeSidebar(onChange: () => void) {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readSidebar(): boolean {
  try {
    sidebarMemory = localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch {
    /* storage blocked: fall back to what was chosen this visit */
  }
  return sidebarMemory;
}

/**
 * Below `lg` (tablet/phone, 2026-10-02 responsive pass): the sidebar becomes an off-canvas drawer instead
 * of permanently eating fixed width out of the content area. Same module-level-var + CustomEvent +
 * useSyncExternalStore pattern as `collapsed` above, so TopBar's hamburger (a different component/client
 * boundary) can open it without lifting state into the server `WorkspaceLayout`. NOT persisted to
 * localStorage, unlike `collapsed` -- a drawer should always start closed on a fresh page load, not
 * remember being left open. NOT animated, same reasoning `collapsed`'s own comment above gives (user,
 * 2026-09-28: "direct ka scene chahiye, jaise hi click karo turant ho jaye") -- instant open/close, no
 * transition, consistent with how this sidebar already behaves everywhere else.
 */
const MOBILE_SIDEBAR_EVENT = "elipse-sidebar-mobile-change";
let mobileOpenMemory = false;

function subscribeMobileSidebar(onChange: () => void) {
  window.addEventListener(MOBILE_SIDEBAR_EVENT, onChange);
  return () => window.removeEventListener(MOBILE_SIDEBAR_EVENT, onChange);
}
function readMobileSidebar(): boolean {
  return mobileOpenMemory;
}
export function useMobileSidebarOpen(): boolean {
  return useSyncExternalStore(subscribeMobileSidebar, readMobileSidebar, () => false);
}
export function toggleMobileSidebar(): void {
  mobileOpenMemory = !mobileOpenMemory;
  window.dispatchEvent(new Event(MOBILE_SIDEBAR_EVENT));
}
export function closeMobileSidebar(): void {
  if (!mobileOpenMemory) return;
  mobileOpenMemory = false;
  window.dispatchEvent(new Event(MOBILE_SIDEBAR_EVENT));
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
  const mounted = useMounted();

  // Open/close, remembered across visits (per browser). The server (and hydration) always renders it open,
  // then the stored choice applies, so the markup matches.
  const collapsed = useSyncExternalStore(subscribeSidebar, readSidebar, () => false);
  const mobileOpen = useMobileSidebarOpen();
  function toggle() {
    const next = !collapsed;
    sidebarMemory = next; // still toggles when storage is blocked, it just is not remembered
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "collapsed" : "open");
    } catch {
      /* not persisted */
    }
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }

  /** app.py only rendered counts for Cold Call/Problem/Follow-ups; Meetings'
   * badge (meetings_count) was added later per user request 2026-09-18, no
   * Streamlit counterpart.
   *
   * `mounted` fixes a hydration mismatch found live 2026-09-23: useMetrics()'s query cache survives
   * client-side navigation, so a full server round-trip to a new page can render a genuinely different
   * count than what the client already has cached from an earlier page -- same root cause and same fix
   * as lead-who.tsx's, see hooks/use-mounted.ts. */
  function badgeFor(key: string | null): number | null {
    if (!mounted || !key || !metrics) return null;
    const value = metrics[key as keyof CrmMetrics];
    return typeof value === "number" && value > 0 ? value : null;
  }

  return (
    <>
      {/* Backdrop: mobile/tablet only, only while the drawer is open. Click to close, same instant (no
          fade) rule as the drawer itself. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          // No transition (2026-09-28, user: "direct ka scene chahiye, jaise hi click karo turant ho jaye" --
          // tried animating this first, which read as slow/"loading"; instant is what was actually wanted).
          // Same rule extends to the mobile drawer below -- it snaps open/closed, no slide animation.
          "flex shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-sidebar py-4",
          // Below `lg`: off-canvas drawer, fixed to the viewport, translated fully off-screen unless open.
          // At `lg` and up: back to today's exact in-flow behavior (static, no translate, no backdrop).
          "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[76px] px-2" : "w-[280px] px-4",
        )}
      >
      {/* Toggle moved above the logo, simple chevron arrows instead of the panel icons (user, 2026-09-23). */}
      <div className={cn("mb-2 flex flex-col gap-2", collapsed && "items-center")}>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? SIDEBAR_TOGGLE.expand : SIDEBAR_TOGGLE.collapse}
          aria-expanded={!collapsed}
          title={collapsed ? SIDEBAR_TOGGLE.expand : SIDEBAR_TOGGLE.collapse}
          className={cn(
            "cursor-pointer text-muted hover:text-accent",
            collapsed ? "self-center" : "self-start",
          )}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" aria-hidden /> : <ChevronLeft className="h-5 w-5" aria-hidden />}
        </button>
        {collapsed ? <LogoMark /> : <Logo />}
      </div>

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const count = badgeFor(item.badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileSidebar}
              aria-current={active ? "page" : undefined}
              title={collapsed ? `${item.name}${count !== null ? ` (${count})` : ""}` : undefined}
              className={cn(
                // Colors still transition (hover/active feedback); padding does NOT -- instant, matching
                // the <aside> above (2026-09-28: an animated collapse read as slow, user wants it immediate).
                "relative flex items-center rounded-[8px] border py-2 text-[0.88rem] font-semibold transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "border-transparent bg-accent text-white"
                  : "border-border bg-card text-text hover:border-accent hover:text-accent",
              )}
            >
              <span aria-hidden className={cn("shrink-0", collapsed ? "text-[1.15rem]" : "mr-2")}>
                <Ico e={item.icon} />
              </span>
              {!collapsed && (
                <span className="overflow-hidden whitespace-nowrap">
                  {item.name}
                  {count !== null && ` (${count})`}
                </span>
              )}
              {collapsed && count !== null && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-badge px-1 text-center text-[0.68rem] font-bold leading-[18px] text-white">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status needs the width; collapsed = navigation only. Theme toggle moved to the top bar
          (user, 2026-09-23) -- these two big buttons took too much sidebar space for an on/off choice. */}
      {!collapsed && (
        <>
          <hr className="my-5 border-border" />

          <Eyebrow>System Status</Eyebrow>
          <SystemStatusPanel initialData={initialStatus} />
        </>
      )}
      </aside>
    </>
  );
}
