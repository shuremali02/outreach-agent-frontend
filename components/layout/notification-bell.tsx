"use client";

import { Bell, CalendarClock, Clock } from "lucide-react";
import { CategoryLabel } from "@/components/ui/emoji-icon";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { useSessionUser } from "@/hooks/use-session-user";
import { NOTIFICATIONS } from "@/lib/constants";
import { notificationTime } from "@/lib/format";
import { ensurePushSubscription } from "@/lib/push";
import { useToast } from "@/components/ui/toast";
import { Loader } from "@/components/ui/loader";
import type { AppNotification } from "@/types";

// Bumped 60s -> 150s (2026-09-29, Neon free-tier network-transfer quota audit): the single highest-frequency
// request in the app before this -- every signed-in user, all day, whether or not anything changed.
const POLL_MS = 150_000;

function whereText(n: AppNotification): string {
  if (n.company_name) return NOTIFICATIONS.onLead(n.company_name);
  if (n.problem_title) return NOTIFICATIONS.onProblem(n.problem_title);
  return "";
}

/**
 * OS-level toast (Notification Web API), NOT a push notification -- it needs this browser tab open
 * SOMEWHERE (can be backgrounded/another tab focused, does not need to be the active one), just not a
 * closed browser. User, 2026-09-28: "agar me dusry tab pr hun toh mujhy notification nahi dikhti" -- the
 * in-app bell/toast only render while this tab is the visible one; this fires instead while it is hidden,
 * so switching to Chrome/Slack/another tab still surfaces it as a normal desktop notification. Closing the
 * tab/browser entirely would need real Web Push (a service worker + backend-stored subscriptions + VAPID
 * keys) -- a bigger addition, not this.
 */
function showDesktopNotification(n: AppNotification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // this tab is already showing the in-app toast/bell
  try {
    const note = new Notification("Elipse Studio", { body: messageText(n), tag: `notif-${n.id}` });
    note.onclick = () => {
      window.focus();
      note.close();
    };
  } catch {
    // Some browsers (notably iOS Safari) advertise the API but throw on construction -- fail silently,
    // the in-app bell/toast still cover this notification once the tab is looked at again.
  }
}

/**
 * Both a meeting reminder and a Pipeline attempt-tracker reminder (2026-10-15, crud/attempt_reminders.py)
 * are system-generated (no actor -- crud/notifications.py notify_all_active) with the full sentence
 * already written into excerpt, so neither is wrapped in the "X mentioned you" template.
 */
function isSystemReminder(n: AppNotification): boolean {
  return n.kind === "meeting_reminder" || n.kind === "attempt_reminder";
}

function messageText(n: AppNotification): string {
  return isSystemReminder(n) ? n.excerpt : NOTIFICATIONS.mentionedYou(n.actor_name, whereText(n));
}

/**
 * Explicit checkpoint badge (2026-09-28, user: "kese pata chalega kis stage ki email hai, 24h ka reminder
 * hai ya 6/2 ghante ya 30 min ka") -- the excerpt already says "in ~24h" etc. in prose, but a rep scanning
 * the list wants it at a glance, not buried in a sentence. Colour mirrors the urgency (accent -> warn ->
 * danger as the meeting gets closer), same idea as PIPELINE_CARD's tags.
 */
const STAGE_BADGE: Record<string, { label: string; color: string }> = {
  "24h": { label: "24h Reminder", color: "var(--accent)" },
  "6h": { label: "6h · Check Email", color: "var(--info)" },
  "2h": { label: "2h · Call", color: "var(--warn)" },
  "30m": { label: "30m · Get Ready", color: "var(--danger)" },
  // Pipeline attempt-tracker reminders (2026-10-15, crud/attempt_reminders.py), stage = "<context>:<n>" --
  // n is always 2 or 3 (next_attempt_due() only exists once attempt 1 has happened). Danger at 3 since
  // that's the last try before the lead would be confirmed Not Interested. "callback:2"/"callback:3"
  // REMOVED 2026-10-16 -- "callback" moved to the per-slot system below.
  "no_show:2": { label: "No Show · Attempt 2 Due", color: "var(--warn)" },
  "no_show:3": { label: "No Show · Attempt 3 Due", color: "var(--danger)" },
  "proposal:2": { label: "Proposal · Attempt 2 Due", color: "var(--warn)" },
  "proposal:3": { label: "Proposal · Attempt 3 Due", color: "var(--danger)" },
  // The scheduled callback_at itself arriving (crud/attempt_reminders.py check_and_fire_callback_due) --
  // a SEPARATE thing from the callback attempt-tracker slots below, sent only to whoever booked it.
  callback_due: { label: "Callback Due Now", color: "var(--danger)" },
  // Per-slot trackers (REDESIGNED 2026-10-16, crud/attempt_reminders.py check_and_fire_slot_reminders()):
  // Proposal Sent's Email/Call Attempt, and Pipeline's Callback attempt tracker -- two stages, a ping to
  // whoever scheduled the slot, then (1h later, if still unactioned) an escalation to the whole team.
  email_followup_slot_due: { label: "Email Follow-up Due", color: "var(--warn)" },
  email_followup_slot_escalated: { label: "Email Follow-up Overdue", color: "var(--danger)" },
  call_followup_slot_due: { label: "Call Follow-up Due", color: "var(--warn)" },
  call_followup_slot_escalated: { label: "Call Follow-up Overdue", color: "var(--danger)" },
  callback_slot_due: { label: "Callback Attempt Due", color: "var(--warn)" },
  callback_slot_escalated: { label: "Callback Attempt Overdue", color: "var(--danger)" },
  // No Show's own Email/Call Attempt trackers (2026-10-19), same per-slot shape as above.
  no_show_email_followup_slot_due: { label: "No Show Email Follow-up Due", color: "var(--warn)" },
  no_show_email_followup_slot_escalated: { label: "No Show Email Follow-up Overdue", color: "var(--danger)" },
  no_show_call_followup_slot_due: { label: "No Show Call Follow-up Due", color: "var(--warn)" },
  no_show_call_followup_slot_escalated: { label: "No Show Call Follow-up Overdue", color: "var(--danger)" },
};

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

  // User, 2026-10-18: "app pr aty he notification allow popup dy do ... agar koi bell icon na dabaye
  // toh is sy notify nhi ayega" -- asks for permission as soon as a signed-in page loads, not only on
  // the bell's first click (a rep who never opens the bell was never getting the prompt at all, so
  // never got push). If permission is already decided (granted/denied from an earlier visit), this is a
  // no-op; if already granted, it just makes sure this device has a push subscription on file.
  useEffect(() => {
    if (!signedIn || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission()
        .then((perm) => {
          if (perm === "granted") ensurePushSubscription();
        })
        .catch(() => undefined);
    } else if (Notification.permission === "granted") {
      ensurePushSubscription();
    }
  }, [signedIn]);

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
      if (fresh.length === 1) toast.info(messageText(fresh[0]));
      else if (fresh.length > 1) toast.info(NOTIFICATIONS.manyNew(fresh.length));
    } else {
      const known = seen.current;
      const brandNew = fresh.filter((n) => !known.has(n.id));
      brandNew.slice(0, 3).forEach((n) =>
        toast.info(messageText(n), isSystemReminder(n) ? undefined : n.excerpt),
      );
      // Desktop toast for genuinely new ones -- deliberately NOT the seen.current===null branch above (that
      // is a backlog from before this tab was open, not something worth an OS popup the moment it loads).
      brandNew.forEach(showDesktopNotification);
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

  /**
   * Fixed 2026-10-16 (user: "me jab click kr rha hun toh woh pipeline pr ja kr lead dhund rha or usy mill
   * nhi rhi kyun k woh lead callback tab me thi pipeline tab me nahi... ese he sari leads pr ho raha hai
   * ... yeh galat hai") -- every lead-linked notification used to hardcode `/pipeline?q=...`, written back
   * when callback-context leads still lived on Pipeline. Since the Callbacks tab split (2026-10-15),
   * a callback/callback_due stage's lead no longer lives there at all, so that search came up empty no
   * matter which page the rep was actually standing on when they clicked it.
   *
   * attempt_reminder's `stage` prefix already tells us exactly which context fired it (crud/
   * attempt_reminders.py) -- route by that instead of guessing one page for everything:
   *   - "callback..." (callback:2/3, callback_due) -> /callbacks, where that tracker/card actually is now.
   *   - "proposal...", "email_followup...", "call_followup..." -> /pipeline (Proposal Sent leads only).
   *   - "no_show..." (2026-10-19) -> /pipeline too, now that No Show leads live there (new "👻 No Show"
   *     filter) -- used to fall through to the generic Contacts fallback, back when they weren't on
   *     Pipeline at all.
   * Anything else that just carries a company_name (an @mention, or a context this doesn't recognise) goes
   * to /contacts?q=... instead of /pipeline -- Contacts is the one page that shows a lead regardless of
   * which desk/stage it's currently sitting in (barring the rare case of a lead still untouched in a desk
   * queue), so "I don't know exactly where this lead lives" now finds it instead of coming up empty.
   */
  function go(n: AppNotification) {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    const q = n.company_name ? encodeURIComponent(n.company_name) : "";
    if (n.problem_id) router.push("/problems");
    else if (n.kind === "meeting_reminder") router.push("/meetings");
    else if (n.kind === "attempt_reminder" && n.stage?.startsWith("callback") && q) {
      router.push(`/callbacks?q=${q}`);
    } else if (
      n.kind === "attempt_reminder" &&
      (n.stage?.startsWith("proposal") ||
        n.stage?.startsWith("email_followup") ||
        n.stage?.startsWith("call_followup") ||
        n.stage?.startsWith("no_show")) &&
      q
    ) {
      router.push(`/pipeline?q=${q}`);
    } else if (q) {
      router.push(`/contacts?q=${q}`);
    }
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
          // Ask on the first click only (a real click = a user gesture, which is what browsers require to
          // even show the permission prompt) -- "default" means never asked yet; "granted"/"denied" both
          // skip this, so a rep who dismissed it once is never re-prompted every time they open the bell.
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
            Notification.requestPermission()
              .then((perm) => {
                if (perm === "granted") ensurePushSubscription();
              })
              .catch(() => undefined);
          }
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
        <>
          {/* Backdrop, mobile only (2026-10-03, caught live on a phone -- "acha nahi lag raha"): without
              it, whatever sits behind the panel (other top bar buttons, the page content underneath) kept
              showing through at the edges, reading as cluttered/half-transparent. Same `fixed inset-0`
              dim-and-tap-to-close pattern the mobile sidebar drawer already uses. Not shown at `sm:` and
              up -- the panel is narrow there and this never looked like a problem on a bigger screen. */}
          <div className="fixed inset-0 z-40 bg-black/50 sm:hidden" onClick={() => setOpen(false)} aria-hidden />
          {/* max-w is viewport-relative, not just 90vw (2026-10-03, caught live on a phone): the bell
              isn't the rightmost element -- UserMenu's avatar sits to its right below `lg` -- so `right-0`
              anchors this panel's right edge well short of the true screen edge. A width that's merely
              "90% of the viewport" could still be wider than the actual room to the panel's left, pushing
              its left edge past x=0 and clipping it (confirmed: the first letter of "Notifications" was
              cut off). Reserving a fixed ~3.5rem (covers the avatar + gap) out of 100vw guarantees the
              left edge never goes negative, however narrow the phone. */}
          <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-3.5rem)] rounded-[10px] border border-border bg-card shadow-lg">
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
                  {n.kind === "meeting_reminder" ? (
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
                  ) : n.kind === "attempt_reminder" ? (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--warn)" }} aria-hidden />
                  ) : (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: n.read ? "transparent" : "var(--accent)" }}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    {/* Lead name / category / who added / who last touched it -- user, 2026-09-28: a bare
                        "Someone mentioned you on X" left no way to tell what this was about at a glance;
                        this reads the same as a lead card without opening it. Blank fields (pre-login data,
                        or no lead at all -- e.g. a Problem Desk mention) just don't render their line. */}
                    {n.company_name && (
                      <span className="block truncate text-[0.85rem] font-semibold">
                        {n.company_name}
                        {n.category && (
                          <span className="ml-1.5 text-[0.72rem] font-normal text-muted">
                            <CategoryLabel value={n.category} />
                          </span>
                        )}
                      </span>
                    )}
                    {(n.added_by_name || n.last_activity_by_name) && (
                      <span className="block text-[0.72rem] text-muted">
                        {n.added_by_name && `Added by ${n.added_by_name}`}
                        {n.added_by_name && n.last_activity_by_name && " · "}
                        {n.last_activity_by_name && `Last activity by ${n.last_activity_by_name}`}
                      </span>
                    )}
                    {n.stage && STAGE_BADGE[n.stage] && (
                      <span
                        className="mt-0.5 inline-block rounded-[6px] px-1.5 py-0.5 text-[0.72rem] font-semibold"
                        style={{ background: STAGE_BADGE[n.stage].color, color: "#fff" }}
                      >
                        {STAGE_BADGE[n.stage].label}
                      </span>
                    )}
                    <span className={`block text-[0.88rem] ${n.read ? "" : "font-semibold"}`}>{messageText(n)}</span>
                    {!isSystemReminder(n) && n.excerpt && (
                      <span className="mt-0.5 block truncate text-[0.8rem] text-muted">{n.excerpt}</span>
                    )}
                    <span className="mt-0.5 block text-[0.72rem] text-muted">{notificationTime(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          </div>
        </>
      )}
    </div>
  );
}
