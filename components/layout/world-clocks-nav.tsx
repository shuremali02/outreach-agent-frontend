"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CountryFlag } from "@/components/ui/emoji-icon";
import { useNow } from "@/hooks/use-now";

/**
 * Live world clocks, moved into the top navbar (2026-10-29) so they're visible on every page, not just
 * Sales Terminal -- see components/terminal/world-clocks.tsx (now removed) for the original version and
 * the server-clock-sync reasoning, unchanged here. US collapses to just its Eastern time + a dropdown for
 * the other 3 zones, UK and Sydney stay as their own always-visible compact pills, Slovenia dropped.
 *
 * DIGITS ONLY (2026-10-29, 3rd redesign pass) -- the `react-clock` analog face never rendered correctly
 * in this navbar no matter how its colours were overridden (two separate attempts, still broken per the
 * user's own screenshot -- a stray circle-with-a-slash glyph instead of a clock face). User: "hum digits
 * me he rkh lety hein" -- dropped the library and the analog face entirely, plain digital time text only.
 * `react-clock` removed from package.json (no longer used anywhere) -- the user should run `npm install`
 * again to actually remove it from node_modules, or just leave it; either is harmless now that nothing
 * imports it.
 *
 * Real-time / DST correctness (user, same message: "yeh real time hona chahiye like jese nov 1 k bad agar
 * whn time zone change hota ha toh inka bhi hona chahiye" -- after Nov 1, when the US zone's clocks change
 * for DST, this should follow): already true, nothing to add here. Every time/label below comes from
 * `Intl.DateTimeFormat` given the IANA zone name itself (e.g. "America/New_York"), never a fixed UTC
 * offset -- the JS engine's own timezone database (the same one the OS/browser ships and keeps updated)
 * decides the real offset AND the real abbreviation ("EDT" vs "EST") for whatever moment `useNow()` is
 * currently ticking at. The US clock will read "EST" on its own the moment DST actually ends, no code
 * change needed, the same way it already correctly started reading "EDT" instead of a hardcoded "EST"
 * this past spring.
 */
const US_PRIMARY = { tz: "America/New_York" }; // EST/EDT, shown collapsed
const US_DROPDOWN = [
  { tz: "America/Chicago" }, // CST/CDT
  { tz: "America/Los_Angeles" }, // PST/PDT
  { tz: "America/Denver" }, // MST/MDT
] as const;

const OTHER_CLOCKS = [
  { code: "GB", label: "UK", tz: "Europe/London" },
  { code: "AU", label: "Sydney", tz: "Australia/Sydney" },
] as const;

function zoneAbbrev(tz: string, at: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? "";
}

function digitalTime(tz: string, at: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(
    at,
  );
}

/** Shared look for every pill in this row (the US trigger button and the plain UK/Sydney pills) --
 * same border/background/radius/padding as the navbar's own circular icon buttons (notification-bell.tsx
 * etc.), so these read as "more of the same instrument row" instead of plain unstyled text floating in
 * the header (user screenshot, 2026-10-29: "sahi sy visvle hon color full theme j hisab sy cards me rkh
 * do ya choty choty" -- card-style background, theme-correct colour, kept small). */
const PILL_CLASS =
  "flex items-center gap-1.5 rounded-full border border-border bg-input px-2.5 py-1";

/** One compact digital-time readout. */
function ClockPill({ tz, at, caption }: { tz: string; at: Date; caption: React.ReactNode }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="text-[0.75rem] font-semibold tabular-nums text-text">{digitalTime(tz, at)}</span>
      <span className="flex items-center gap-1 text-[0.6rem] text-muted">{caption}</span>
    </span>
  );
}

export function WorldClocksNav() {
  const now = useNow();
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

  // null on the server/during hydration (see useNow()'s own comment) -- nothing painted until the first
  // real tick, so a wrong server-time clock never flashes on screen.
  if (now === null) return null;
  const at = new Date(now);

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <div ref={boxRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="US time zones"
          className={`${PILL_CLASS} cursor-pointer hover:border-accent`}
        >
          <CountryFlag code="US" />
          <ClockPill tz={US_PRIMARY.tz} at={at} caption={zoneAbbrev(US_PRIMARY.tz, at)} />
          <ChevronDown className={`h-3 w-3 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open && (
          <div className="absolute right-0 z-50 mt-2 flex flex-col gap-2 rounded-[10px] border border-border bg-card p-3 shadow-lg">
            {US_DROPDOWN.map((z) => (
              <ClockPill key={z.tz} tz={z.tz} at={at} caption={zoneAbbrev(z.tz, at)} />
            ))}
          </div>
        )}
      </div>
      {OTHER_CLOCKS.map((c) => (
        <span key={c.tz} className={PILL_CLASS}>
          <CountryFlag code={c.code} />
          <ClockPill tz={c.tz} at={at} caption={c.label} />
        </span>
      ))}
    </div>
  );
}
