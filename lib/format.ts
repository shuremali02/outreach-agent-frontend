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
 * "2026-09-17 16:40" in the VIEWER's own local time. Backend timestamps
 * (created_at etc.) are real UTC instants marked with a trailing "Z" (see
 * app/schemas/lead.py _dt_utc()) specifically so `new Date(iso)` converts
 * correctly here -- confirmed live 2026-09-17: without that marker, and
 * without going through a real Date object, this was showing the server's
 * raw UTC clock unconverted (11:38 shown when it was actually 16:38 PKT).
 * Deliberately built from the Date object's own getters, not string slicing
 * -- slicing the original UTC string can show the wrong calendar DATE too,
 * not just the wrong time, for anything within ~5 hours of UTC midnight.
 */
function localDateTimeParts(iso: string): { date: string; d: Date } | null {
  if (!iso) return null;
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date, d };
}

/** Comment timestamps: app.py rendered created_at[:16] with T -> space. */
export function commentTime(iso: string): string {
  const parts = localDateTimeParts(iso);
  if (!parts) return "";
  const { date, d } = parts;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  const time = parts.d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${parts.date} · ${time}`;
}

export function shortDate(iso: string): string {
  return localDateTimeParts(iso)?.date ?? "";
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
