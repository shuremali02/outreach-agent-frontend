"use client";

import { useMemo } from "react";
import { useNow } from "@/hooks/use-now";
import { CalendarClock } from "lucide-react";
import type { Lead } from "@/types";

/**
 * Meeting countdown banner -- boss's request via the user (2026-09-28): "6 hours pehle to check email, 2
 * hours pehle to make call, 30 mins pehle for meeting". The 24h stage is bell-only (notification-bell.tsx,
 * kind="meeting_reminder", fired by the backend's crud/meeting_reminders.py poll); these three ALSO get a
 * banner here so a rep glances at Today and knows the next thing to do without opening the bell. Purely a
 * presentation bucket on the client (does not read the meeting_reminders table) -- it recomputes on every
 * render from `meeting_at`, so it is always accurate even if the backend poll is behind or offline.
 *
 * `leads` is whatever the Today page already fetched (a slim list is fine -- only pipeline_stage, meeting_at
 * and company_name are read, none of the slim-deferred fields).
 */
const WINDOW_HOURS = { checkEmail: 6, makeCall: 2, meetingSoon: 0.5 } as const;

type Bucket = "checkEmail" | "makeCall" | "meetingSoon";

function bucketOf(hoursLeft: number): Bucket | null {
  if (hoursLeft < 0 || hoursLeft > WINDOW_HOURS.checkEmail) return null;
  if (hoursLeft <= WINDOW_HOURS.meetingSoon) return "meetingSoon";
  if (hoursLeft <= WINDOW_HOURS.makeCall) return "makeCall";
  return "checkEmail";
}

const BUCKET_LABEL: Record<Bucket, string> = {
  checkEmail: "Check email for a reply",
  makeCall: "Call to confirm",
  meetingSoon: "Meeting starting soon",
};

const BUCKET_COLOR: Record<Bucket, string> = {
  checkEmail: "var(--info)",
  makeCall: "var(--warn)",
  meetingSoon: "var(--danger)",
};

function timeLeftText(hoursLeft: number): string {
  const totalMinutes = Math.max(0, Math.round(hoursLeft * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function MeetingReminderBanner({ leads }: { leads: Lead[] }) {
  const now = useNow();

  const rows = useMemo(() => {
    if (now === null) return [];
    return leads
      .filter((l) => l.pipeline_stage === "meeting_booked" && l.meeting_at)
      .map((l) => {
        // meeting_at is a naive wall-clock string (schemas/lead.py _dt) -- new Date() reads it as local
        // time, exactly the time the rep typed, same as every other meeting_at read in the app.
        const hoursLeft = (new Date(l.meeting_at as string).getTime() - now) / 3_600_000;
        const bucket = bucketOf(hoursLeft);
        return bucket ? { lead: l, bucket, hoursLeft } : null;
      })
      .filter((r): r is { lead: Lead; bucket: Bucket; hoursLeft: number } => r !== null)
      .sort((a, b) => a.hoursLeft - b.hoursLeft)
      .slice(0, 5);
  }, [leads, now]);

  if (rows.length === 0) return null;

  return (
    <div className="mb-5 flex flex-col gap-2">
      {rows.map(({ lead, bucket, hoursLeft }) => (
        <div
          key={lead.id}
          className="flex items-center gap-3 rounded-[10px] border px-4 py-2.5"
          style={{ borderColor: BUCKET_COLOR[bucket], background: `color-mix(in srgb, ${BUCKET_COLOR[bucket]} 12%, var(--card))` }}
        >
          <CalendarClock className="h-[18px] w-[18px] shrink-0" style={{ color: BUCKET_COLOR[bucket] }} aria-hidden />
          <span className="min-w-0 flex-1 text-[0.88rem]">
            <strong>{lead.company_name}</strong>
            <span className="text-muted"> -- meeting in {timeLeftText(hoursLeft)}</span>
          </span>
          <span className="shrink-0 rounded-[6px] px-2 py-1 text-[0.78rem] font-semibold" style={{ color: BUCKET_COLOR[bucket] }}>
            {BUCKET_LABEL[bucket]}
          </span>
        </div>
      ))}
    </div>
  );
}
