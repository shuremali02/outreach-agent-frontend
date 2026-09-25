import type { Lead, LeadSource } from "@/types";

/** $1,234,567 — matches Streamlit's f"${v:,.0f}". */
export function currency(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function compactCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return currency(value);
}

export function num(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** "MONDAY, SEPTEMBER 10, 2026" — the .date-eyebrow on Today. */
export function todayEyebrow(d = new Date()): string {
  return d
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

/**
 * "2026-09-17 16:40" in TEAM time (PKT, see below). Backend timestamps
 * (created_at etc.) are real UTC instants marked with a trailing "Z" (see
 * app/schemas/lead.py _dt_utc()) specifically so `new Date(iso)` converts
 * correctly here -- confirmed live 2026-09-17: without that marker, and
 * without going through a real Date object, this was showing the server's
 * raw UTC clock unconverted (11:38 shown when it was actually 16:38 PKT).
 * Deliberately built from the Date object's own getters, not string slicing
 * -- slicing the original UTC string can show the wrong calendar DATE too,
 * not just the wrong time, for anything within ~5 hours of UTC midnight.
 */
function localDateTimeParts(iso: string): { date: string; hour: number; minute: number } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Team time (Pakistan, fixed UTC+5, no DST -- same constant the Today/This Week blocks below use), NOT the
  // machine's timezone. Vercel renders the page on a UTC server and the browser then re-renders in PKT, so
  // using local getters showed every timestamp twice over: first 3:25 PM (server HTML), then 8:25 PM
  // (after hydration) -- reps read the flash as "the newest lead is from 3:25" (found live 2026-09-25).
  // A fixed zone makes the server and the browser agree.
  const k = new Date(d.getTime() + 5 * 3600_000);
  const date = `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, "0")}-${String(k.getUTCDate()).padStart(2, "0")}`;
  return { date, hour: k.getUTCHours(), minute: k.getUTCMinutes() };
}

/** Comment timestamps: app.py rendered created_at[:16] with T -> space. */
export function commentTime(iso: string): string {
  const parts = localDateTimeParts(iso);
  if (!parts) return "";
  const { date, hour, minute } = parts;
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${date} ${time}`;
}

/**
 * "2026-09-15 · 5:30 PM" -- when a lead was added, shown on lead cards.
 * 12-hour, unlike commentTime's 24-hour above -- that one deliberately
 * matches app.py's original comment-timestamp rendering, this one has no
 * such precedent and reps asked for 12-hour specifically.
 */
export function addedAt(iso: string): string {
  const parts = localDateTimeParts(iso);
  if (!parts) return "";
  const h12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  const time = `${h12}:${String(parts.minute).padStart(2, "0")} ${parts.hour < 12 ? "AM" : "PM"}`;
  return `${parts.date} · ${time}`;
}

export function shortDate(iso: string): string {
  return localDateTimeParts(iso)?.date ?? "";
}

/**
 * Leads (Contacts) page's "Today's Leads" / "This Week's Leads" block (user request, 2026-09-22).
 *
 * "Today" is the team's PKT SALES DAY -- 2 PM to 2 AM PKT, NOT midnight to midnight -- and "This Week" is
 * Monday 00:00 PKT to the next Monday 00:00 PKT, exactly mirroring app/crud/call_events.py's _day_bounds()/
 * _week_bounds() so this block agrees with the Today page and Sales Terminal ("hamary pass 2 sy 2 ki logic
 * hai", 2026-09-24 -- this first shipped as browser-local calendar day/week, which was wrong for that).
 * Fixed UTC+5 offset (Pakistan has no DST), so it doesn't depend on the viewer's own timezone either.
 * DAY_START_HOUR/DAY_LENGTH_HOURS below are copied from call_events.py (_DAY_START_HOUR = 14, 12h window) --
 * if that changes there, change it here too.
 *
 * Note the consequence of a 12h window: like call activity, "today" only covers 2 PM-2 AM. Between 2 AM
 * and 2 PM it still shows the sales day that just ended (matches the backend), and a lead created in that
 * 2 AM-2 PM gap falls inside no "today" window at all -- it does count toward "this week".
 */
const PKT_OFFSET_MS = 5 * 3600_000;
const DAY_START_HOUR = 14;
const DAY_LENGTH_HOURS = 12;

function salesDayBounds(nowMs: number): [number, number] {
  const pkt = new Date(nowMs + PKT_OFFSET_MS); // getUTC* on this are PKT wall-clock fields
  const anchorDay = pkt.getUTCHours() >= DAY_START_HOUR ? pkt.getUTCDate() : pkt.getUTCDate() - 1;
  const startPktWall = Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), anchorDay, DAY_START_HOUR);
  const start = startPktWall - PKT_OFFSET_MS;
  return [start, start + DAY_LENGTH_HOURS * 3600_000];
}

function weekBounds(nowMs: number): [number, number] {
  const pkt = new Date(nowMs + PKT_OFFSET_MS);
  const sinceMonday = (pkt.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  const startPktWall = Date.UTC(pkt.getUTCFullYear(), pkt.getUTCMonth(), pkt.getUTCDate() - sinceMonday);
  const start = startPktWall - PKT_OFFSET_MS;
  return [start, start + 7 * 24 * 3600_000];
}

export function isToday(iso: string): boolean {
  const t = new Date(iso).getTime();
  const [start, end] = salesDayBounds(Date.now());
  return t >= start && t < end;
}

export function isThisWeek(iso: string): boolean {
  const t = new Date(iso).getTime();
  const [start, end] = weekBounds(Date.now());
  return t >= start && t < end;
}

/**
 * Which channel found/added this lead, read off source_prompt -- exact
 * strings written by app/services/lead_engine.py ("CSV Batch Import"),
 * app/crud/leads.py create_lead() ("Manual entry"), and Google Maps sourcing
 * (qualify.py prefixes "qualify: " + the "Google Maps sourcing:" marker
 * runners.py puts on the icp_prompt it passes in). No separate DB column.
 *
 * Confirmed live 2026-09-17: the plain "AI Lead Finder" Discover tab (the
 * only AI path actually wired into the UI) is agent_core.run_agent(), whose
 * save payload sets source_prompt to the RAW user prompt with no "qualify: "
 * prefix at all -- unlike the /jobs/qualify funnel, which is not reachable
 * from this UI. Every such lead was falling through to "other" (invisible
 * under the "AI Generated" filter/pill) because the old logic assumed ALL
 * AI-discovered leads were prefixed. Fixed by defaulting to ai_generated
 * instead -- Manual/CSV/Maps are checked explicitly above it, so anything
 * left over is some form of AI discovery, which is the common case here.
 */
export function leadSource(sourcePrompt: string): LeadSource {
  const sp = sourcePrompt || "";
  if (!sp) return "other";
  if (sp.includes("Google Maps sourcing:")) return "google_maps";
  if (sp === "CSV Batch Import") return "csv_import";
  if (sp === "Manual entry") return "sales_team";
  return "ai_generated";
}

/**
 * app.py guarded every mailto with:
 *   email and email != "unknown" and "@" in email
 */
export function hasUsableEmail(email: string | undefined | null): boolean {
  return Boolean(email && email !== "unknown" && email.includes("@"));
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function telUrl(phone: string): string {
  // A contact/lead's phone field can now hold several comma-joined numbers
  // (see lead_engine.py's _all_phones() / import_september_leads.py) --
  // dial only the first one, not every digit run together.
  const first = phone.split(",")[0] || "";
  return `tel:${first.replace(/[^\d+]/g, "")}`;
}

/** Google X-Ray fallback when no LinkedIn URL is on file. */
export function linkedInXrayUrl(contactName: string, companyName: string): string {
  const q = `site:linkedin.com/in ${contactName} ${companyName}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export function linkedInDirectSearchUrl(contactName: string, companyName: string): string {
  const q = `${contactName} ${companyName}`.trim();
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`;
}

/** Prefix bare domains so href doesn't resolve relative to the app. */
export function externalUrl(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function displayDomain(url: string): string {
  if (!url) return "";
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

/** lead_engine._slugify — used for screenshot filenames. */
export function slugify(text: string): string {
  const s = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "lead";
}

export function contactLabel(lead: Pick<Lead, "contact_name" | "company_name">): string {
  return lead.contact_name || lead.company_name;
}

export interface LocalClock {
  /** Weekday and inside [startHour, endHour) in that timezone. */
  open: boolean;
  /** e.g. "9:12 AM" */
  time: string;
  /** "Sat" / "Sun" when it is the weekend there (always closed), else "". */
  weekend: string;
  /** e.g. "Chicago" */
  city: string;
}

/**
 * The wall-clock time in `tz` at `at`, and whether it is business hours there
 * (Mon-Fri, [startHour, endHour)). null for an unknown/invalid timezone --
 * Intl throws RangeError on a bad IANA name, so never let that reach render.
 */
export function localClock(
  tz: string,
  at: Date,
  startHour: number,
  endHour: number,
): LocalClock | null {
  if (!tz) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const hour = Number(get("hour"));
    const weekday = get("weekday");
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    }).format(at);
    const weekend = weekday === "Sat" || weekday === "Sun";
    return {
      open: !weekend && hour >= startHour && hour < endHour,
      time,
      weekend: weekend ? weekday : "",
      city: (tz.split("/").pop() ?? tz).replace(/_/g, " "),
    };
  } catch {
    return null;
  }
}
