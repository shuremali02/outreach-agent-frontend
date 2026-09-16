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

/** Comment timestamps: app.py rendered created_at[:16] with T -> space. */
export function commentTime(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

/**
 * "2026-09-15 · 5:30 PM" -- when a lead was added, shown on lead cards.
 * 12-hour, unlike commentTime's 24-hour above -- that one deliberately
 * matches app.py's original comment-timestamp rendering, this one has no
 * such precedent and reps asked for 12-hour specifically.
 */
export function addedAt(iso: string): string {
  if (!iso) return "";
  const time = new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${iso.slice(0, 10)} · ${time}`;
}

export function shortDate(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/**
 * Which channel found/added this lead, read off source_prompt -- exact
 * strings written by app/services/qualify.py ("qualify: <icp>", used by
 * both AI Discovery and Google Maps sourcing, distinguished by the "Google
 * Maps sourcing:" prefix runners.py puts on the icp_prompt it passes in),
 * app/services/lead_engine.py ("CSV Batch Import"), and
 * app/crud/leads.py create_lead() ("Manual entry"). No separate DB column.
 */
export function leadSource(sourcePrompt: string): LeadSource {
  const sp = sourcePrompt || "";
  if (sp.includes("Google Maps sourcing:")) return "google_maps";
  if (sp.startsWith("qualify:")) return "ai_generated";
  if (sp === "CSV Batch Import") return "csv_import";
  if (sp === "Manual entry") return "sales_team";
  return "other";
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
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
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
