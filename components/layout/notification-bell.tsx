"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { useSessionUser } from "@/hooks/use-session-user";
import { NOTIFICATIONS } from "@/lib/constants";
import { commentTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { Loader } from "@/components/ui/loader";
import type { AppNotification } from "@/types";

const POLL_MS = 60_000;

function whereText(n: AppNotification): string {
  if (n.company_name) return NOTIFICATIONS.onLead(n.company_name);
  if (n.problem_title) return NOTIFICATIONS.onProblem(n.problem_title);
  return "";
}

/**
 * Bell + unread count in the top bar. Renders nothing when nobody is signed in (login off), same as the
 * user menu; anything sent while the person was offline is waiting the next time they sign in.
 *
 * Polling cost (2026-09-24): this used to poll BOTH the list and the count every 30s, list included while
 * the dropdown was closed -- 76% of the backend's requests in one HF log, each one ~3 DB round trips. Now
 * only the count (one COUNT query) is polled, every 60s and on focus. The list -- which the snackbar needs
 * to say WHO mentioned you -- is fetched only when there is something unread, when the dropdown opens, and
 * when the count goes up. Known gap: if one mention is read elsewhere while a new one arrives inside the
 * same 60s the count does not rise, so that one waits until the next poll that changes it or a dropdown open.
 */
export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const signedIn = useSessionUser() !== null;
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const count = useQuery({
    queryKey: ["notifications-count"],
    queryFn: notificationsApi.unreadCount,
    enabled: signedIn,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    // Focus refetch only if the last one is older than this, so alt-tabbing back and forth is free.
    staleTime: 30_000,
    retry: false,
  });
  const unread = count.data?.count ?? 0;

  // No interval, no focus refetch: kept fresh by the count effect below and by opening the dropdown.
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(20),
    enabled: signedIn && (open || unread > 0),
    retry: false,
  });

  // A rise in the unread count means something new arrived: refresh the list (a no-op while it is
  // disabled -- it then fetches the moment `unread > 0` enables it).
  const prevUnread = useRef<number | null>(null);
  useEffect(() => {
    const n = count.data?.count;
    if (n === undefined) return;
    const prev = prevUnread.current;
    prevUnread.current = n;
    if (prev !== null && n > prev) qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [count.data, qc]);

  // Snackbar for anything new since the last poll. The first load only says "you have N", so
  // a backlog from while you were away is one message, not a stack of them.
  const seen = useRef<Set<number> | null>(null);
  useEffect(() => {
    const items = list.data;
    if (!items) return;
    const fresh = items.filter((n) => !n.read);
    if (seen.current === null) {
      if (fresh.length === 1) toast.info(NOTIFICATIONS.mentionedYou(fresh[0].actor_name, whereText(fresh[0])));
      else if (fresh.length > 1) toast.info(NOTIFICATIONS.manyNew(fresh.length));
    } else {
      const known = seen.current;
      fresh.filter((n) => !known.has(n.id)).slice(0, 3).forEach((n) =>
        toast.info(NOTIFICATIONS.mentionedYou(n.actor_name, whereText(n)), n.excerpt),
      );
    }
    seen.current = new Set(items.map((n) => n.id));
  }, [list.data, toast]);

  // Close on outside click / Escape.
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

  // Both read endpoints already return the new unread count -- use it instead of asking again.
  const applyRead = (res: { count: number }) => {
    qc.setQueryData(["notifications-count"], res);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: applyRead });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: applyRead });

  function go(n: AppNotification) {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.problem_id) router.push("/problems");
    else if (n.company_name) router.push(`/pipeline?q=${encodeURIComponent(n.company_name)}`);
  }

  if (!signedIn) return null;
  const items = list.data ?? [];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          // Opening shows the current list, not whatever was fetched a while ago.
          if (!open) qc.invalidateQueries({ queryKey: ["notifications"] });
          setOpen((v) => !v);
        }}
        aria-label={unread ? `${NOTIFICATIONS.bell} (${unread} unread)` : NOTIFICATIONS.bell}
        aria-expanded={open}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-input text-text hover:border-accent"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[0.7rem] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-[10px] border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[0.95rem] font-semibold">{NOTIFICATIONS.title}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="inline-flex cursor-pointer items-center gap-1 text-[0.8rem] font-semibold text-accent hover:underline disabled:cursor-default"
              >
                {markAll.isPending && <Loader className="h-3 w-3" />}
                {NOTIFICATIONS.markAll}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-auto">
            {list.isError && <li className="px-3 py-4 text-[0.85rem] text-danger">{NOTIFICATIONS.loadFailed}</li>}
            {!list.isError && items.length === 0 && (
              <li className="px-3 py-4 text-[0.85rem] text-muted">{NOTIFICATIONS.empty}</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => go(n)}
                  className="flex w-full cursor-pointer items-start gap-2 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-input"
                >
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: n.read ? "transparent" : "var(--accent)" }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[0.88rem] ${n.read ? "" : "font-semibold"}`}>
                      {NOTIFICATIONS.mentionedYou(n.actor_name, whereText(n))}
                    </span>
                    {n.excerpt && <span className="mt-0.5 block truncate text-[0.8rem] text-muted">{n.excerpt}</span>}
                    <span className="mt-0.5 block text-[0.72rem] text-muted">{commentTime(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
