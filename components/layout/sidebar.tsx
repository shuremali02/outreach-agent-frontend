"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
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

  /** app.py only rendered counts for Cold Call/Problem/Follow-ups; Meetings'
   * badge (meetings_count) was added later per user request 2026-09-18, no
   * Streamlit counterpart. */
  function badgeFor(key: string | null): number | null {
    if (!key || !metrics) return null;
    const value = metrics[key as keyof CrmMetrics];
    return typeof value === "number" && value > 0 ? value : null;
  }

  return (
    <aside className="flex w-[280px] shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar px-4 py-4">
      <Logo />

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const count = badgeFor(item.badge);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-[8px] border px-3 py-2 text-[0.88rem] font-semibold transition-colors",
                active
                  ? "border-transparent bg-accent text-white"
                  : "border-border bg-card text-text hover:border-accent hover:text-accent",
              )}
            >
              <span aria-hidden className="mr-2">
                {item.icon}
              </span>
              {item.name}
              {count !== null && ` (${count})`}
            </Link>
          );
        })}
      </nav>

      <hr className="my-5 border-border" />

      <Eyebrow>Preferences</Eyebrow>
      <ThemeToggle />

      <hr className="my-5 border-border" />

      <Eyebrow>System Status</Eyebrow>
      <SystemStatusPanel initialData={initialStatus} />
    </aside>
  );
}
