import type { LeadSource, PipelineStage } from "@/types";

/** db.PIPELINE_STAGES — order matters, it drives every stage dropdown. */
export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "new_lead", label: "New Discovery" },
  { id: "draft_ready", label: "Draft Ready" },
  { id: "contacted", label: "Outreach Sent" },
  { id: "followup_due", label: "Follow-up Due" },
  { id: "meeting_booked", label: "Meeting Booked" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "won", label: "Deal Won" },
  { id: "lost", label: "Closed Lost" },
];

export const STAGE_LABELS: Record<PipelineStage, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.id, s.label]),
) as Record<PipelineStage, string>;

/**
 * db.STANDARD_CATEGORIES — the emoji prefix is part of the stored DB key,
 * not decoration. Never strip it.
 */
export const STANDARD_CATEGORIES = [
  "⛳ Custom Golf Carts",
  "🏎️ Custom Automotive & Mobility",
  "🛋️ Luxury Furniture & Interiors",
  "🏗️ Real Estate & Megaprojects",
  "⛵ Superyachts & Marine",
  "⚡ Tech & Commercial Products",
] as const;

export const ALL_CATEGORIES = "All Categories";

export const ALL_COUNTRIES = "All Countries";
/** Sentinel for leads with no country recorded yet -- never a real ISO2 code. */
export const UNKNOWN_COUNTRY = "unknown";

/**
 * ISO 3166-1 alpha-2 -> display label, for CountryPills / the Pipeline
 * Country Filter / Add a Lead's Country field. Same ~40-code set the backend
 * can produce (validation._TLD_REGION / services/countries.py), so every
 * country the app stores has a matching label here.
 */
export const COUNTRIES: { id: string; label: string }[] = [
  { id: "US", label: "🇺🇸 United States" },
  { id: "GB", label: "🇬🇧 United Kingdom" },
  { id: "AE", label: "🇦🇪 United Arab Emirates" },
  { id: "SA", label: "🇸🇦 Saudi Arabia" },
  { id: "QA", label: "🇶🇦 Qatar" },
  { id: "KW", label: "🇰🇼 Kuwait" },
  { id: "BH", label: "🇧🇭 Bahrain" },
  { id: "OM", label: "🇴🇲 Oman" },
  { id: "CA", label: "🇨🇦 Canada" },
  { id: "AU", label: "🇦🇺 Australia" },
  { id: "NZ", label: "🇳🇿 New Zealand" },
  { id: "DE", label: "🇩🇪 Germany" },
  { id: "FR", label: "🇫🇷 France" },
  { id: "IT", label: "🇮🇹 Italy" },
  { id: "ES", label: "🇪🇸 Spain" },
  { id: "NL", label: "🇳🇱 Netherlands" },
  { id: "BE", label: "🇧🇪 Belgium" },
  { id: "CH", label: "🇨🇭 Switzerland" },
  { id: "AT", label: "🇦🇹 Austria" },
  { id: "SE", label: "🇸🇪 Sweden" },
  { id: "NO", label: "🇳🇴 Norway" },
  { id: "DK", label: "🇩🇰 Denmark" },
  { id: "FI", label: "🇫🇮 Finland" },
  { id: "IE", label: "🇮🇪 Ireland" },
  { id: "PT", label: "🇵🇹 Portugal" },
  { id: "PL", label: "🇵🇱 Poland" },
  { id: "IN", label: "🇮🇳 India" },
  { id: "PK", label: "🇵🇰 Pakistan" },
  { id: "SG", label: "🇸🇬 Singapore" },
  { id: "MY", label: "🇲🇾 Malaysia" },
  { id: "ZA", label: "🇿🇦 South Africa" },
  { id: "BR", label: "🇧🇷 Brazil" },
  { id: "MX", label: "🇲🇽 Mexico" },
  { id: "JP", label: "🇯🇵 Japan" },
  { id: "CN", label: "🇨🇳 China" },
  { id: "TR", label: "🇹🇷 Turkey" },
  { id: "GR", label: "🇬🇷 Greece" },
  { id: "CZ", label: "🇨🇿 Czech Republic" },
  { id: "RO", label: "🇷🇴 Romania" },
  { id: "HU", label: "🇭🇺 Hungary" },
];

export function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.id === code)?.label ?? code;
}

export const ALL_SOURCES = "All Sources";

/**
 * Labels for lib/format.ts leadSource() -- which channel found/added a
 * lead, shown as a badge on every lead card and as a filter (Source
 * Filter / SourcePills) alongside Category and Country. Purely derived
 * client-side, no backend column.
 */
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  sales_team: "🧑‍💼 Sales Team",
  ai_generated: "🤖 AI Generated",
  google_maps: "🗺️ Google Maps Generated",
  csv_import: "📄 CSV Import",
  other: "❔ Other",
};

/** Sidebar navigation — replaces the st.session_state["active_tab"] dispatch. */
export const NAV_ITEMS = [
  { name: "Today", icon: "⊞", href: "/today", badge: null },
  { name: "Sales Terminal", icon: "📊", href: "/terminal", badge: null },
  { name: "Cold Call Desk", icon: "⚡", href: "/cold-call", badge: "call_ready_count" },
  { name: "Problem Desk", icon: "🎯", href: "/problems", badge: "open_problems_count" },
  { name: "Pipeline", icon: "💼", href: "/pipeline", badge: null },
  { name: "Contacts", icon: "👥", href: "/contacts", badge: null },
  { name: "Follow-ups", icon: "📅", href: "/follow-ups", badge: "followups_due" },
  { name: "Meetings", icon: "🗓️", href: "/meetings", badge: null },
  { name: "AI Lead Finder", icon: "🔍", href: "/lead-finder", badge: null },
] as const;

/** Rotates on a 15-minute slot (app.py: int(time.time() // 900)). */
export const SALESFORCE_QUOTES: [string, string][] = [
  ["Control what you can control — your list, your tone, your effort.", "Belal Batrawy"],
  ["It's not about having the right opportunities. It's about handling the opportunities right.", "Mark Hunter"],
  ["Quality is better than quantity. One home run is better than two doubles.", "Steve Jobs"],
  ["You don't get great at selling in a day. You get great at selling day by day.", "Jeffrey Gitomer"],
  ["If there is one critical ingredient for wealth and happiness, it is discipline.", "Jim Rohn"],
  ["Focus on making your customers as successful as possible, and your success will always follow.", "Ian Koniak"],
  ["It can take a lot of 'no's' before you find someone who needs your product, but they are out there.", "Daniel Disney"],
  ["Today's clients aren't just skimming for the lowest price — they're looking for genuine connection.", "Simon Bowen"],
  ["You can be the same as everyone else, or you can change the game and create curiosity to win more.", "Dale Dupree"],
  ["You cannot control the prospect on the other end, only your reaction to disappointment.", "Rana Kordahi"],
  ["Want to be a great conversationalist? Let the other person talk, while you genuinely listen.", "Bob Burg"],
  ["I really believe you only regret the things you don't do.", "Alan Bond"],
  ["We don't learn much when things go right. Learn from mistakes and keep improving.", "Simon Sinek"],
  ["Opportunities don't happen. You create them.", "Chris Grosser"],
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["Success is walking from failure to failure with no loss of enthusiasm.", "Winston Churchill"],
  ["The human part of selling will never change, so give yourself the advantage of more opportunities.", "Alexine Mudawar"],
  ["Always do your best. What you plant now, you will harvest later.", "Og Mandino"],
  ["Action is the foundational key to all success.", "Pablo Picasso"],
];

export const QUOTE_SLOT_SECONDS = 900;

/**
 * Copy lifted verbatim from app.py. Kept here rather than inline so it can be
 * diffed against the Streamlit source in one place — paraphrasing it silently
 * changes what the sales team reads.
 */

/** app.py:1679 — caption under every lead-count slider. */
export const GEMINI_QUOTA_CAPTION =
  "Each lead ≈ 1 extra Gemini call. Runs above ~12 can exhaust the free Gemini daily quota (~20/day) and take several minutes.";

/** app.py:1671 — the ingest expander title on the Cold Call Desk. */
export const INGEST_TITLE =
  "📥 Ingest Daily 300-Lead Batch (Free AI Discovery, CSV Import, or Apollo API)";

export const INGEST_TABS = {
  ai: "🤖 Free AI Web Discovery (No API Key)",
  csv: "📁 Bulk CSV Drag-and-Drop (Free)",
  apollo: "🚀 Apollo.io Direct API (Paid Plans)",
} as const;

/** app.py:1674-1684 — Free AI Web Discovery tab. */
export const AI_DISCOVERY = {
  intro:
    "Use Gemini Flash live web search + Hunter.io enrichment to discover real commercial businesses, look up decision makers, and generate custom 20-second phone scripts — 100% Free, no Apollo API key required.",
  label: "Target ICP & Industry Query",
  defaultValue:
    "US companies that are B Tier companies doing around 1M to 10M in profits and would be interested in Interactive 3D Configurators",
  sliderLabel: "Leads to discover this run",
  button: "🚀 Discover & Generate Calling Battlecards (Free)",
  success: (n: number) =>
    `🎉 Generated and added ${n} qualified call-ready leads with scripts to your Cold Call Desk!`,
  empty:
    "Found no new companies (or all discovered were already in your database). Try specifying a different niche or state!",
} as const;

/** app.py:1739-1766 — Bulk CSV tab. */
export const CSV_IMPORT = {
  intro:
    "Drag and drop any CSV export from Apollo, ZoomInfo, Clay, or LinkedIn Sales Navigator. The engine auto-detects columns, standardizes phone numbers, and generates custom scripts.",
  label: "Upload CSV File",
  button: (n: number) => `⚡ Scrub Phones & Generate Battlecards (${n} Leads)`,
  success: (n: number) => `🎉 Successfully scrubbed and imported ${n} call-ready leads!`,
} as const;

/** app.py:1691-1736 — Apollo.io tab. */
export const APOLLO_IMPORT = {
  intro:
    "Query Apollo.io's B2B database directly for verified decision-maker emails, mobile phone numbers, and LinkedIn URLs.",
  notice:
    "ℹ️ Apollo Plan Notice: Apollo.io blocks direct REST API access on their Free plan (requires Basic $49/mo). If you are on Apollo's free plan, simply do your search on the Apollo.io website, click 'Export to CSV', and drop it into the 'Bulk CSV Drag-and-Drop' tab for free!",
  label: "Target ICP Query",
  defaultValue:
    "Custom golf cart builders and luxury vehicle manufacturers in US with $1M-$20M revenue",
  sliderLabel: "Leads to Fetch",
  keyLabel: "Apollo.io API Key",
  keyPlaceholder: "Paste Apollo API key...",
  keyHelp: "Get your key from Apollo.io -> Settings -> API Keys (Requires paid Apollo plan)",
  button: "🚀 Fetch & Enrich Batch from Apollo",
  success: (n: number) =>
    `🎉 Successfully added ${n} verified, call-ready leads to your Cold Call Desk!`,
} as const;

/** app.py:1717-1719 — the scan/enrich checkbox pair, shared by CSV and Apollo. */
export const ENRICH_OPTIONS = {
  scrapeLabel: "🔍 Scan each site with Playwright",
  scrapeHelp:
    "Slower: visits every company's website to detect existing 3D tech + capture a screenshot.",
  enrichLabel: "✨ Deep-enrich with SignalHire",
  enrichHelp:
    "Only runs for leads still missing an email or phone. Consumes SignalHire credits.",
} as const;

/** app.py:2359-2376 — the AI Lead Finder view. The field starts EMPTY here. */
export const LEAD_FINDER = {
  heading: "AI Lead Discovery & Research",
  subtitle: "Gemini 3.6 Flash live web search + Hunter.io decision-maker enrichment.",
  label: "What kind of businesses are you targeting?",
  placeholder:
    "e.g. Find 5 luxury bespoke kitchen cabinet manufacturers in UAE or UK without a 3D configurator",
  sliderLabel: "Leads to discover this run",
  button: "🚀 Discover & Draft Leads",
  success: (n: number) =>
    `🎉 Successfully generated and added ${n} new qualified lead(s) into your CRM!`,
  skipped: (n: number) => `Skipped ${n} already in your database.`,
  empty:
    "Found no new companies (or all discovered were already in your database). Try specifying a different niche or state!",
  // Country constraint, shared by both the AI and Google Maps tabs -- folded
  // into the AI prompt server-side, sent as Google Places' regionCode for
  // Maps (see app/jobs/runners.py run_discover / run_maps_qualify). No
  // Streamlit analogue -- app.py's discovery had no country constraint.
  countryLabel: "Country",
  countryAny: "🌍 Any Country",
} as const;

/**
 * The qualification funnel has no Streamlit counterpart — app.py discovers leads
 * in one ungrounded call and never rejects any. These strings are registered in
 * scripts/check-copy.py's ALLOWED set for that reason.
 */
export const QUALIFY = {
  note:
    "Each company is researched on the live web, its site is scanned, and its contacts are verified before it is saved. Runs take a few minutes; leads that cannot be verified are rejected, not saved.",
  running: "Researching & verifying…",
  provider: (name: string, model: string) =>
    model ? `Researched with ${name} (${model}).` : `Researched with ${name}.`,
  qualified: (n: number) =>
    `${n} lead${n === 1 ? "" : "s"} passed every check and were saved.`,
  rejectedHeading: (n: number) =>
    `${n} did not pass — shown so you can see what the agent tried:`,
  skipped: (n: number) => `${n} were already in your pipeline.`,
  noResults: "No companies survived qualification this run. Try a broader ICP.",
  stageLabels: {
    resolve: "no live website",
    identity: "site does not match the company",
    fit: "already has a 3D configurator",
    contacts: "no reachable contact found",
    validate: "contact details did not validate",
    error: "error during qualification",
    dedupe: "already in pipeline",
    discovery: "discovery could not confirm it",
  } as Record<string, string>,
} as const;

/**
 * Google Maps-based sourcing — an alternative to the AI web-search discovery
 * agent above. Finds businesses via the Places API (name + website only, no
 * LLM tokens spent), then feeds the same qualification funnel QUALIFY.* runs.
 * No Streamlit analogue.
 */
export const MAPS_FINDER = {
  sourceAi: "AI Search",
  sourceMaps: "Google Maps",
  queryLabel: "What are you searching for on Google Maps?",
  queryPlaceholder: "e.g. custom golf cart dealers in Texas",
  button: "Search Google Maps & Verify",
  note: "Businesses are sourced from Google Maps instead of AI web search, then scanned and verified the same way.",
  droppedNoWebsite: (n: number) =>
    `${n} more had no website listed on Google Maps and were skipped before qualification.`,
} as const;

export const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1VS1nEC6qNe4IabeTSTNaMJ-JsVvqj1lEVzxxwsKVToU/edit";

/** Stages that appear on the Follow-up Hub. */
export const FOLLOWUP_STAGES: PipelineStage[] = ["contacted", "followup_due", "proposal_sent"];

/** Stages that feed the Cold Call Desk queue (minus dead numbers). */
export const CALL_QUEUE_STAGES: PipelineStage[] = ["draft_ready", "followup_due"];

/**
 * app.py:1665-2038, 2313, 2359 — the eyebrow / heading / subtitle for each view.
 * Where app.py has no `date-eyebrow` for a view, `eyebrow` is undefined here too;
 * inventing one adds a line the Streamlit app never showed.
 */
export const PAGE_HEADERS = {
  terminal: {
    eyebrow: "WALL STREET OUTREACH TERMINAL // ELIPSE DESK",
    title: "Sales Floor Velocity",
    subtitle:
      "High-frequency outbound dials, live connections, and meeting pipeline generation.",
  },
  coldCall: {
    eyebrow: "OUTBOUND VELOCITY // ZERO-RESEARCH CALLING DESK",
    title: "Cold Call Battlecard Deck",
    subtitle:
      "300 daily pre-scrubbed leads with verified direct lines, live on-screen 20-second scripts, and objection rebuttals.",
  },
  problems: {
    eyebrow: "SALES OPERATIONS & STRATEGY",
    title: "Sales Problem Desk",
    subtitle: "Prioritize and resolve the top blockers faced by your outreach team.",
  },
  pipeline: {
    eyebrow: undefined,
    title: "Studio Pipeline",
    subtitle: "Track and progress accounts through your sales stages and industry sectors.",
  },
  contacts: {
    eyebrow: "DIRECTORY & SEGMENTATION",
    title: "Contacts & Accounts",
    subtitle:
      "Segmented client directory by target industry sector with real-time deal management.",
  },
  followUps: {
    eyebrow: undefined,
    title: "Follow-up Hub",
    subtitle: "Stay on top of active conversations and scheduled check-ins.",
  },
  // No Streamlit analogue -- app.py never tracked a meeting date at all.
  meetings: {
    eyebrow: undefined,
    title: "Meetings",
    subtitle: "Every meeting your team has booked, laid out on the calendar.",
  },
  leadFinder: {
    eyebrow: undefined,
    title: "AI Lead Discovery & Research",
    subtitle: "Gemini 3.6 Flash live web search + Hunter.io decision-maker enrichment.",
  },
} as const;

/** app.py:1556-1590 — the five conversion-funnel steps on the Sales Terminal. */
export const FUNNEL_STEPS = [
  { label: "1. Outreach Dials Initiated", sub: "Base outbound volume" },
  { label: "2. Contacts Reached", sub: "" },
  { label: "3. Live Conversations", sub: "" },
  { label: "4. Explicit Interest Expressed", sub: "" },
  { label: "5. Qualified Meetings Booked", sub: "" },
] as const;

/** app.py:1874-1892, 1955-2032 — the Cold Call Desk battlecard. */
export const BATTLECARD = {
  researchHeading: "🌐 Research & Channels",
  websiteLink: "↗ Website",
  linkedInLink: "🔗 LinkedIn",
  linkedInSearchLink: "🔗 Search LinkedIn",
  editContact: "✏️ Edit Phone / LinkedIn",
  // components/cold-call/battlecard.tsx -- click-to-reveal for
  // HunterDecisionMakers, so a Call Desk page full of leads doesn't fire one
  // GET /leads/{id}/contacts per visible card on load. No Streamlit analogue.
  // Two different entry points into the same panel, chosen by whether this
  // lead already has a known contact (lead.contact_name):
  //  - known already -> this small text link, just to expand and view it.
  //  - nothing known yet -> findContacts below, a full prominent button
  //    shown directly (no hidden gate), identical label to the button one
  //    level inside (contacts-panel.tsx) it stands in for.
  showContacts: "👥 Show decision-maker contacts",
  // Same literal text as contacts-panel.tsx's own internal button -- reusing
  // it here means clicking this looks and reads exactly like that button,
  // even though what it actually does is mount the panel with
  // autoSearchOnMount so the search fires immediately, no second click.
  findContacts: "🎯 Find decision makers",
  phoneLabel: "Direct Phone",
  phonePlaceholder: "+1 (555) 000-0000",
  linkedInLabel: "LinkedIn Profile URL",
  linkedInPlaceholder: "https://www.linkedin.com/in/...",
  saveContact: "💾 Save Contact Info",
  saveSuccess: "Updated contact info!",
  // "Open in Mail App" only opens a mailto: link -- the backend has no way to
  // know an email was actually sent, so this is a separate, explicit,
  // rep-confirmed record (call_events.py). No Streamlit analogue.
  markEmailSent: "✅ Mark Email Sent",
  emailMarkedSent: "Email marked sent!",
  whyHelps: "Why Elipse Studio Helps:",
  whyHelpsFallback:
    "High-ticket custom catalog converts higher with real-time 3D web builder.",
  scriptHeading: "🎯 Live 20-Second Phone Script (Read Verbatim)",
  generateBattlecard: "✨ Generate AI battlecard",
  generatingBattlecard: "Generating…",
  objectionsHeading: "🛡️ Live Objection Matrix & Rebuttals",
  noteLabel: "Call Notes / Follow-up Details",
  notePlaceholder: "e.g. Left voicemail · gatekeeper screened · callback Tue 2 PM",
  // Saves this note immediately (append-only, crud/leads.py add_note()),
  // independent of clicking a disposition below -- a note typed mid-call no
  // longer has to wait for the call to end with a specific outcome to be
  // saved at all. No Streamlit analogue.
  addNote: "➕ Add Note",
  dispositionsHeading: "⚡ 1-Click Call Outcome Dispositions",
  booked: (company: string, value: string) =>
    `🎉 BOOM! Meeting booked for ${company} (${value})!`,
} as const;

/** app.py:1876-1881 — used when phone_script is missing or under 15 chars. */
export function fallbackScript(firstName: string, company: string): string {
  return (
    `Hi ${firstName}, Bilal with Elipse Studio. I was looking at ${company}'s custom collection online, ` +
    `and noticed your buyers browse static photos rather than customizing finishes live in 3D. ` +
    `We build interactive real-time 3D web configurators that let clients customize options live on your site before buying. ` +
    `Would you be open to a 3-minute visual concept tailored for ${company} this Thursday?`
  );
}

/** app.py:1885-1892 — used when objection_notes is missing or under 15 chars. */
export const FALLBACK_OBJECTIONS = [
  "**- 'We already have photos on our site':**",
  "Photos show what you already built; an interactive 3D builder lets high-ticket buyers customize what they want to buy today.",
  "",
  "**- 'Just send me an email with information':**",
  "I'll send that over to your direct inbox right now. Are you at your screen Thursday at 2 PM to see a 3-minute live preview?",
  "",
  "**- 'We are too busy / call back in 6 months':**",
  "Completely understand. Our 3D models integrate directly into your site in under 2 weeks without eating up your team's time.",
].join("\n");

/** app.py:2000-2031 — the 1-click disposition bar, with its button tooltips. */
export const DISPOSITIONS = [
  {
    outcome: "dead_number",
    label: "🔴 Dead Line",
    help: "Number is disconnected or bad. Removes from queue.",
  },
  {
    outcome: "voicemail",
    label: "🟡 Voicemail",
    help: "Left pitch voicemail. Keeps in Follow-up queue.",
  },
  {
    outcome: "not_interested",
    label: "💬 No Interest",
    help: "Spoke with decision maker, not interested.",
  },
  {
    outcome: "callback_scheduled",
    label: "⏳ Callback",
    help: "Asked to call back later.",
  },
  {
    outcome: "meeting_booked",
    label: "🎯 Booked!",
    help: "Qualified Meeting Booked! Advances to Pipeline stage.",
  },
  {
    outcome: "receptionist",
    label: "👤 Receptionist",
    help: "Reached the receptionist/gatekeeper, not a decision maker. Keeps in Follow-up queue.",
  },
  {
    outcome: "decision_maker",
    label: "🧑‍💼 Decision Maker",
    help: "Spoke with the decision maker directly, no outcome yet. Keeps in Follow-up queue.",
  },
  {
    outcome: "no_answer",
    label: "📞 No Answer",
    help: "Phone rang, nobody picked up. Keeps in Follow-up queue.",
  },
  {
    outcome: "hang_up",
    label: "🚫 Hang Up",
    help: "Call connected then was hung up before any conversation. Keeps in Follow-up queue.",
  },
  {
    outcome: "wrong_number",
    label: "📵 Wrong Number",
    help: "This number doesn't reach the company at all. Removes from queue.",
  },
  {
    outcome: "closed",
    label: "🤝 Closed",
    help: "Client is closing the deal, not final yet. Advances to Proposal Sent.",
  },
] as const;

/**
 * components/cold-call/cold-call-view.tsx — splits the call queue into two
 * headed sections instead of one flat list. No app.py analogue: a lead
 * already called once (voicemail/callback) never leaves this queue, so a
 * large queue buried a handful of brand-new leads among ones already worked.
 */
export const COLD_CALL_QUEUE = {
  newHeading: (count: number) => `🆕 New Leads (${count})`,
  followUpHeading: (count: number) => `📞 Follow-ups Due (${count})`,
} as const;

/**
 * components/cold-call/battlecard.tsx (the "🎯 Booked!" click -> date/time
 * prompt) and components/pipeline/pipeline-view.tsx (editing a meeting's
 * time later). No app.py analogue -- app.py never captured a meeting date.
 */
export const MEETING_BOOKING = {
  prompt: "When is the meeting?",
  dateLabel: "Date",
  timeLabel: "Time",
  confirm: "✅ Confirm booking",
  cancel: "Cancel",
} as const;

/** components/meetings/meetings-calendar.tsx. No app.py analogue. */
export const MEETINGS_CALENDAR = {
  prevMonth: "‹ Prev",
  nextMonth: "Next ›",
  today: "Today",
  moreCount: (n: number) => `+${n} more`,
} as const;

/**
 * components/meetings/meetings-calendar.tsx -- per-meeting quick actions so a
 * rep can close out a meeting without opening Pipeline. "Done" moves the lead
 * to Proposal Sent (the next stage after a meeting actually happens); "Cancel"
 * moves it to Closed Lost (client said no meeting after all). Both just PATCH
 * pipeline_stage via the existing useUpdateLead hook -- no new endpoint.
 */
export const MEETING_ACTIONS = {
  done: "✅ Done",
  cancel: "✖ Cancel",
  doneConfirm: (company: string) => `Mark the meeting with ${company} as done? This moves the lead to Proposal Sent.`,
  cancelConfirm: (company: string) => `Cancel the meeting with ${company}? This moves the lead to Closed Lost.`,
} as const;

/**
 * components/today/activity-scroller.tsx -- replaces the Google-Sheet-backed
 * SalesFloorTicker on the Today page with two horizontal-scroll rows read
 * live from call_events (app/crud/call_events.py), not the sheet. No
 * Streamlit analogue -- app.py had no per-day/per-week activity breakdown.
 */
export const ACTIVITY_SCROLLER = {
  todayHeading: "Today",
  thisWeekHeading: "This Week",
  // Same 10 cards shown in both rows -- only the numbers differ (today's
  // window vs this week's), never the set of metrics. `key` matches
  // ActivityWindow's field names (types/metrics.ts). `color` is a fixed hex
  // (not a --success/--warn/etc. theme token) specifically so all 10 cards
  // can each get their own distinct, high-contrast color -- the app only
  // has 4-5 semantic tokens, not enough for 10 visually-different cards.
  cards: [
    { key: "calls", label: "Calls", color: "#3b82f6" },
    { key: "connected", label: "Connected", color: "#10b981" },
    { key: "emails", label: "Emails", color: "#e06842" },
    // "Leads" alone read as ambiguous -- this specifically counts leads the
    // sales team added manually (source_prompt == "Manual entry"), not AI/
    // Maps/CSV-discovered ones, so the label says so.
    { key: "leads_added", label: "Sales Team Leads", color: "#8b5cf6" },
    { key: "followups", label: "Follow-ups", color: "#f59e0b" },
    { key: "meetings", label: "Meetings", color: "#14b8a6" },
    { key: "disconnected", label: "Disconnected", color: "#ef4444" },
    { key: "voicemail", label: "Voicemail", color: "#ec4899" },
    { key: "receptionist", label: "Receptionist", color: "#06b6d4" },
    { key: "decision_maker", label: "Decision Maker", color: "#6366f1" },
  ],
} as const;

/**
 * app.py:877, 931, 1147, 1223, 1859, 2065, 2231, 2320 — empty and warning states.
 * These are what the sales team is used to reading; a shorter paraphrase drops
 * the instruction telling them what to do next.
 */
export const EMPTY_STATES = {
  // Was "...Use the batch ingestion drawer above to pull verified leads from
  // Apollo or drop a CSV file." -- that drawer is commented out (see
  // cold-call-view.tsx), so pointing to it left a dead end. Points at Lead
  // Finder (AI Search / Google Maps) instead, which is how leads are sourced now.
  coldCallQueue: "🎯 No leads in this queue! Use Lead Finder (AI Search or Google Maps) to find new leads.",
  pipeline:
    "No leads found for this filter combination. Try selecting 'All Categories' or use 'AI Lead Finder'.",
  contacts: (category: string) =>
    `No leads found under '${category}'. Use 'AI Lead Finder' or 'Add a Lead' to discover companies for this category.`,
  followUps:
    "No active follow-ups due right now. When you mark leads as 'Outreach Sent', they will appear here.",
  problems: "No problems recorded in this category. All clear!",
  comments:
    "No discussions yet. Share your thoughts, objection rebuttals, or solutions below!",
  // Was "...found on Hunter.io for {site}." -- this list has been
  // provider-neutral (SignalHire + ContactOut, not Hunter-only) since the
  // contacts-panel rewrite. Points at the manual LinkedIn/X-Ray search
  // already on the card above, since a company neither paid provider's
  // database covers (common for small/niche/international businesses)
  // genuinely has no automated path left -- see docs.md 2026-09-14.
  decisionMakers: (site: string) =>
    `No decision maker found automatically for ${site}. Neither SignalHire nor ContactOut has this company -- use the LinkedIn research / Google X-Ray search above to find one manually.`,
  noWebsite: "No website on this lead to scan.",
  // components/enrichment/site-scan-panel.tsx -- shown after "Find website"
  // (Google Places lookup) runs and comes back with nothing for this company.
  websiteNotFound: "Could not find a website for this company on Google Maps.",
  noPhone: "No phone on file.",
  // components/meetings/meetings-calendar.tsx. No app.py analogue.
  meetings: (monthLabel: string) =>
    `No meetings booked in ${monthLabel} yet. Click "🎯 Booked!" on a call to schedule one.`,
  /** app.py:1859 — Cold Call Desk queue, reused for Today's priority list. */
  todayPriority:
    "🎯 No leads in this queue! Use the batch ingestion drawer above to pull verified leads from Apollo or drop a CSV file.",
} as const;

/** app.py:1081-1096, 1232 — the Problem Desk form and comment box. */
export const PROBLEM_FORM = {
  titleLabel: "Problem / Bottleneck Title",
  titlePlaceholder:
    "e.g. Prospects asking for live 3D pricing before agreeing to meeting",
  priorityLabel: "Priority",
  priorityHelp:
    "High Priority = urgent blocker stopping deals/calls. Normal Priority = process or collateral improvement.",
  descLabel: "Details / Context / What needs to be solved",
  descPlaceholder:
    "Explain the exact objection, missing collateral, or list quality issue...",
  reportedByLabel: "Reported By",
  reportedByDefault: "Sales Rep",
  submit: "🚨 Submit Problem to Desk",
  commentLabel: "Your Input / Solution / Playbook",
  commentPlaceholder: "Write response or solution here...",
} as const;

/** app.py:1404-1408, 2326 — inline field labels on lead cards. */
export const LEAD_CARD = {
  fitObservation: "Fit Observation:",
  subject: "Subject:",
  currentStage: "Current Stage:",
  followUpSubject: "Initial Outreach Subject:",
} as const;

/** app.py:1054-1059 — the Problem Desk card header (both instances). */
export const PROBLEM_DESK_HEADER = {
  eyebrow: "SALES TEAM BOTTLENECKS & CHALLENGES",
  title: "Sales Problem Desk // Priority Tracker",
  subtitle:
    "Sales team logs top-priority roadblocks, objections, and process hurdles that need immediate solving.",
} as const;

/** app.py:1599-1602 — the Weekly Velocity card on the Sales Terminal. */
export const WEEKLY_VELOCITY = {
  title: "Weekly Velocity & Sprint Momentum",
  subtitle: "Sprint-over-sprint tracking across all 3 weeks of team execution.",
} as const;

/** app.py:843-859 — render_linkedin_research_and_reveal_ui link labels. */
export const LINKEDIN_PANEL = {
  research: "🤖 AI Research LinkedIn (Gemini Flash)",
  // "(Apollo Reveal)" dropped -- these links never call Apollo, see
  // components/enrichment/linkedin-panel.tsx. Note: open/xray below are
  // currently unused -- linkedin-panel.tsx hardcodes its own copy of them.
  open: "🔗 Open LinkedIn",
  xray: "🌐 Google X-Ray Search",
  directSearch: "Or open in LinkedIn search bar",
  unresolved: "Could not resolve direct URL automatically. Use Google X-Ray link below.",
} as const;

/**
 * app.py:996-1027 — render_site_scan_ui's result block.
 *
 * Two things here are load-bearing and easy to lose in a rewrite:
 *   - `blocked` (a 403, Cloudflare, a captcha) is a SUCCESSFUL scan. The message
 *     has to say it proves nothing about the lead, or a rep bins a good company.
 *   - an `error` is a CAPTION above the verdict, not a replacement for it —
 *     Streamlit still renders the signals line underneath.
 */
export const SITE_SCAN = {
  scanIssue: (error: string) => `⚠️ Scan issue: ${error}`,
  blocked: (httpStatus: number, why: string) =>
    `🛡️ Site blocked the scanner${httpStatus ? ` (HTTP ${httpStatus})` : ""} — ${why}. ` +
    `This says nothing about whether the lead is good; many real sites block bots. `,
  blockedLinkPrefix: "Open ",
  blockedLinkSuffix: " yourself to check.",
  mismatch: (website: string, why: string) =>
    `🚫 This website does not match the lead. ${website} reads as something else entirely ` +
    `(${why}). The company name/contact were most likely invented by the AI — ` +
    `verify before calling or emailing.`,
  signalsLabel: "Site 3D signals:",
  has3d: (signals: string) => `${signals} — already has interactive tech.`,
  unknown:
    "none found — but the page returned almost no readable text, so treat this as unverified.",
  fit: "none found — 🔥 strong fit for an Elipse configurator / 3D visualization.",
  weakSignals: (signals: string) => `Mentions (not confirmed 3D): ${signals}`,
  productLabel: "Product:",
  enrichComplete: "Enrichment complete.",
} as const;
