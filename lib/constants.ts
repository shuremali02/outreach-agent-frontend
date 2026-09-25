import type { LeadSource, PipelineStage } from "@/types";

/** db.PIPELINE_STAGES — order matters, it drives every stage dropdown. */
export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "new_lead", label: "New Discovery" },
  { id: "draft_ready", label: "Draft Ready" },
  // Renamed from "Outreach Sent" -- structure-plan.md Phase 3/4: this is now where the new "Email
  // Send" button (Cold Call Desk) lands a lead, same stage id ("contacted"), new label everywhere.
  { id: "contacted", label: "Email Send" },
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
  { id: "EG", label: "🇪🇬 Egypt" },
];

export function countryLabel(code: string): string {
  return COUNTRIES.find((c) => c.id === code)?.label ?? code;
}

/**
 * Add a Lead popover's own Country dropdown -- was narrowed to just US/UK/Canada on 2026-09-18; France
 * and Saudi Arabia added back 2026-09-23, United Arab Emirates 2026-09-24 (user request -- asked for
 * "Dubai", which is a city: the country entry is "AE", labelled United Arab Emirates). Pipeline/Contacts/
 * Cold Call Desk's filter dropdowns keep the full COUNTRIES list above so leads already in the CRM from any
 * other country (Pakistan, etc.) stay filterable regardless of what this popover offers.
 */
export const ADD_LEAD_COUNTRIES = COUNTRIES.filter((c) => ["US", "GB", "CA", "FR", "SA", "AE", "QA", "EG"].includes(c.id));

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

/**
 * Team activity (auth-plan.md): Today's per-person table, the Sales Terminal's Weekly Report and the
 * Recent Activity feed. No Streamlit analogue -- app.py had one shared login-less view.
 */
export const TEAM_ACTIVITY = {
  todayHeading: "👥 Team, Today",
  weeklyTab: "📅 Weekly Report",
  sheetTab: "📊 Google Sheet history",
  person: "Person",
  columns: {
    calls: "Calls",
    connected: "Connected",
    voicemail: "Voicemail",
    receptionist: "Reception",
    decision_maker: "Decision Maker",
    meetings: "Meetings",
    // Key is still "followups" (wire compat) -- shows as "Pipeline", counting only what puts a lead into
    // Pipeline (Callback/Meeting/Proposal/Email Send), not voicemail/no-answer/hang-up. User, 2026-09-24.
    followups: "Pipeline",
    emails: "Emails",
    leads_added: "Leads Added",
    disconnected: "Dead Lines",
  },
  unassignedNote:
    "\"Unassigned\" is activity recorded before sign-in existed. It is counted in the team total.",
  noneYet: "No activity yet today. Rows appear as people sign in and start calling.",
  weekNotStarted: (start: string) => `Week 1 starts on ${start}. Weekly rows appear from then.`,
  inProgress: "in progress",
  callsChange: (n: number) => `${n > 0 ? "+" : ""}${n} calls vs last week`,
  beforeTracking: "Before tracking started (no per-person data)",
  feedHeading: "Recent Activity",
  allPeople: "Everyone",
  feedEmpty: "Nothing recorded yet.",
  feedFilter: "Show activity for",
  sheetUnavailable: "The Google Sheet history is not available right now.",
  event: {
    email_sent: "✉️ Marked an email as sent",
    note_added: "📝 Added a note",
    stage_change: (stage: string) => `➡️ Moved to ${stage}`,
  },
} as const;

/**
 * Sign-in page and user menu (components/auth/login-view.tsx, components/layout/user-menu.tsx).
 * No Streamlit analogue: app.py had no login (auth-plan.md).
 */
export const LOGIN = {
  title: "Sign in",
  subtitle: "Sign in with your approved team email.",
  backendDown: "Can't reach the server right now. Try again in a moment.",
  loading: "Loading…",
  signingIn: "Signing you in…",
  failed: "Sign-in failed. Please try again.",
  devHeading: "Local testing only: sign in by email (no Google)",
  devButton: "Sign in (test)",
  tabSignIn: "Sign in",
  tabCreate: "Create account",
  createTitle: "Create your account",
  createSubtitle: "Only approved team emails can create an account.",
  nameLabel: "Your name",
  emailLabel: "Email",
  passwordLabel: "Password",
  confirmLabel: "Confirm password",
  codeLabel: "Invite code",
  signInButton: "Sign in",
  createButton: "Create account",
  or: "or",
  welcomeBack: "Welcome back",
  switchToCreate: "New here? Create an account",
  switchToSignIn: "Already have an account? Sign in",
  signInInstead: "Sign in instead",
  showPassword: "Show password",
  hidePassword: "Hide password",
  passwordRulesLabel: "Password requirements",
  strength: ["Too weak", "Weak", "Fair", "Good", "Strong"],
  passwordsMatch: "Passwords match",
  namePlaceholder: "e.g. Ayesha Khan",
  codeHint: "Ask your admin for the team invite code.",
  submitting: "Please wait…",
  panelHeading: "Your team's calling desk, in one place.",
  panelPoints: [
    "Every call, note and stage change is saved under the person who did it.",
    "A daily and weekly report for each person on the team.",
    "@mention a teammate on any lead and they get a notification.",
  ],
} as const;

export const USER_MENU = { signOut: "Sign out" } as const;

/**
 * @mentions and the notification bell (components/common/mention-field.tsx,
 * components/layout/notification-bell.tsx). No Streamlit analogue (auth-plan.md section 12).
 * A mention only notifies -- it never assigns the lead.
 */
export const MENTIONS = {
  teamLabel: "Everyone on the team",
  teamHint: "Notifies every signed-in teammate",
  hint: "Type @ to mention a teammate, or @team for everyone. They get a notification.",
} as const;

export const NOTIFICATIONS = {
  bell: "Notifications",
  title: "Notifications",
  empty: "Nothing yet. When someone mentions you, it shows up here.",
  markAll: "Mark all read",
  loadFailed: "Could not load notifications.",
  onLead: (company: string) => `on ${company}`,
  onProblem: (title: string) => `in Problem Desk: ${title}`,
  mentionedYou: (who: string, where: string) => `${who} mentioned you ${where}`.trim(),
  manyNew: (n: number) => `You have ${n} unread notifications.`,
} as const;

export const ADD_LEAD_TEAM = {
  label: "Tell the team (optional)",
  placeholder: "e.g. @Ilhan please try this one, owner wants a quote",
} as const;

/** Sidebar open/close button (components/layout/sidebar.tsx). No Streamlit analogue: st.sidebar collapses natively. */
export const SIDEBAR_TOGGLE = {
  collapse: "Close sidebar",
  expand: "Open sidebar",
} as const;

/** Sidebar navigation — replaces the st.session_state["active_tab"] dispatch. */
// Order requested by the user 2026-09-22 ("tabs ka format change kro"): Today and Sales Terminal stay
// first, then Leads, Cold Call Desk, the new placeholder Email tab, Pipeline, Meetings, Projects --
// Problem Desk moved out of its old 4th slot to near the end, AI Lead Finder last of all.
export const NAV_ITEMS = [
  { name: "Today", icon: "⊞", href: "/today", badge: null },
  { name: "Sales Terminal", icon: "📊", href: "/terminal", badge: null },
  { name: "Leads", icon: "👥", href: "/contacts", badge: null },
  // Badge removed (user, 2026-09-23) -- only Pipeline/Meetings/Problem Desk keep a sidebar counter now.
  { name: "Cold Call Desk", icon: "⚡", href: "/cold-call", badge: null },
  // Placeholder (user, 2026-09-22): reserved for a future dedicated Email view. No page behind it yet.
  { name: "Email", icon: "✉️", href: "/email", badge: null },
  // Count hidden for now (user, 2026-09-25: the CSV-imported leads are not in this number yet). To bring it
  // back set badge to "pipeline_count" -- the backend still sends it (crud/leads.py get_crm_metrics).
  // { name: "Pipeline", icon: "💼", href: "/pipeline", badge: "pipeline_count" },
  { name: "Pipeline", icon: "💼", href: "/pipeline", badge: null },
  // Retired by structure-plan.md Phase 6: the Follow-ups page is gone -- voicemail/callback chasing
  // moved to Cold Call Desk (Phase 3), post-meeting follow-up to Meetings (Phase 5).
  { name: "Meetings", icon: "🗓️", href: "/meetings", badge: "meetings_count" },
  // structure-plan.md Phase 7: closed deals, split out of Pipeline (Phase 4) and out of the
  // meeting-outcome confirm copy's temporary "find it in Contacts" note (Phase 5). Narrowed 2026-09-22
  // to Won only -- Proposal Sent moved back into Pipeline (see MEETING_OUTCOMES.proposal_sent).
  { name: "Projects", icon: "📁", href: "/projects", badge: null },
  { name: "Problem Desk", icon: "🎯", href: "/problems", badge: "open_problems_count" },
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
  // Places results with a phone but no website: off = skipped (as before),
  // on = saved as call-only leads dialled on the business line, no scan.
  callOnlyLabel: "Also keep businesses with a phone but no website (call-only)",
  callOnlyHelp:
    "Saved without a website scan and dialled on Google's listed business line (switchboard).",
} as const;

export const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1VS1nEC6qNe4IabeTSTNaMJ-JsVvqj1lEVzxxwsKVToU/edit";

// Retired by structure-plan.md Phase 6: the Follow-up Hub page is gone.
// FOLLOWUP_STAGES: PipelineStage[] = ["contacted", "followup_due", "proposal_sent"]

// Retired by structure-plan.md Phase 3: Cold Call Desk membership is now lead.sent_to_desk_at, not stage.
// Kept as a comment for history -- CALL_QUEUE_STAGES: PipelineStage[] = ["draft_ready", "followup_due"]

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
  // No Streamlit analogue -- structure-plan.md Phase 7, narrowed 2026-09-22 (Proposal Sent moved to
  // Pipeline, so this is Won only now).
  projects: {
    eyebrow: undefined,
    title: "Projects",
    subtitle: "Deals that have been won -- Client Closed.",
  },
  // Placeholder tab (user, 2026-09-22) -- reserved for a future dedicated Email view, nothing built yet.
  email: {
    eyebrow: undefined,
    title: "Email",
    subtitle: "Coming soon.",
  },
  contacts: {
    eyebrow: "DIRECTORY & SEGMENTATION",
    // Sidebar tab renamed "Contacts" -> "Leads" per user request; route/component names (/contacts,
    // ContactsView) left as they are -- only the visible copy changed.
    title: "Leads & Accounts",
    subtitle:
      "Segmented client directory by target industry sector with real-time deal management.",
  },
  // Retired by structure-plan.md Phase 6: PAGE_HEADERS.followUps = { title: "Follow-up Hub", ... }
  // No Streamlit analogue -- app.py never tracked a meeting date at all.
  // Retired 2026-09-22 (user): PAGE_HEADERS.meetings = { title: "Meetings", subtitle: "Every meeting
  // your team has booked, laid out on the calendar." } -- the Meetings page no longer shows a heading.
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
/**
 * components/enrichment/contacts-panel.tsx -- per-contact "Find LinkedIn"
 * (free web search) so the paid "Find phone" gets a LinkedIn URL to work from
 * instead of a name guess. No Streamlit analogue (core-plan.md Phase 6/9).
 */
export const CONTACT_LOOKUP = {
  findLinkedIn: "🔎 Find LinkedIn (free)",
  findingLinkedIn: "Searching…",
  findLinkedInHelp: "Free web search for this person's LinkedIn profile. No credits are spent.",
  linkedInNotFound: "🔎 No LinkedIn profile found for this person.",
  linkedInFailed: "LinkedIn search failed. Try again.",
  phoneTipNoLinkedIn:
    "Tip: run Find LinkedIn (free) first. A LinkedIn URL gives Find phone the best chance of a match.",
} as const;

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
  // Fallbacks only -- the mutation's own error.message is shown when present
  // (see battlecard.tsx). Confirmed live 2026-09-18: record/generate/
  // markEmailSent/addNote had no error branch at all, so a failed request
  // (a disposition, a meeting booking, generating a script, marking an
  // email sent, saving a call note) silently reverted to the idle button
  // with zero feedback that anything had gone wrong.
  recordFailed: "Failed to record this outcome. Try again.",
  generateFailed: "Failed to generate the battlecard. Try again.",
  markEmailSentFailed: "Failed to mark email sent. Try again.",
  addNoteFailed: "Failed to save note. Try again.",
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
    // Renamed from "🤝 Closed" (user, 2026-09-22): this sets the exact same stage
    // (proposal_sent) as the Meeting popup's "📄 Proposal Send" outcome, and the old label read
    // like the deal was already won/final -- it isn't. Same status, same name everywhere now.
    // "Proposal Send" not "Send Proposal" -- matches the existing "Email Send" naming pattern.
    label: "📄 Proposal Send",
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
  // Line filter + local-time ordering (2026-09-19). The queue puts leads
  // whose LOCAL time is inside CALL_WINDOW first, then direct lines before
  // switchboards. No Streamlit analogue -- app.py never knew a lead's timezone.
  lineFilterLabel: "Line Filter",
  lineOptions: [
    { id: "all", label: "All lines" },
    { id: "direct", label: "🟢 Direct lines" },
    { id: "switchboard", label: "🟡 Switchboard (gatekeeper)" },
    { id: "none", label: "⚪ No usable number" },
  ],
  openNowCard: "Open Now (Local Time)",
  resort: "🕘 Sort by local time",
  resortAgain: "🕘 Re-sort by local time",
  newestFirst: "Newest first",
  resortHelp:
    "Leads whose local time is inside business hours come first. Order only refreshes when you click this, so cards don't jump while you work.",
} as const;

/** Local business-hours window used to decide who is "at their desk" right now. */
export const CALL_WINDOW = { startHour: 9, endHour: 17 } as const;

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
 * components/meetings/needs-followup-list.tsx -- above the calendar (structure-plan.md Phase 5). The
 * only piece the old Follow-ups page's "After meetings" tab left behind, relocated here.
 */
export const NEEDS_FOLLOWUP = {
  // Renamed from "Needs Follow-up" (user request, 2026-09-22): read as the old, removed Follow-ups page
  // coming back. This is still exactly the old "After meetings" tab, nothing else -- name now says so.
  heading: (n: number) => `🔁 After Meetings (${n})`,
  note: "Every lead whose meeting date has passed, whatever stage it is at now. Call or email again, then update the stage.",
  empty: "No leads are waiting after a meeting right now.",
  searchPlaceholder: "Company, contact or email…",
  sortRecent: "Recently updated first",
  sortOldest: "Oldest first",
  showing: (shown: number, total: number) => `Showing ${shown} of ${total}`,
  stageLabel: "Move to",
} as const;

/**
 * Dead Line / Not Interested (structure-plan.md Phase 3), and Meeting's own Not Interested (Phase 5):
 * the lead is recorded, not deleted, but is now hidden from every list -- Cold Call Desk, Contacts and
 * Pipeline -- not just moved to Closed Lost. A later phase adds a way to find these again; there isn't
 * one yet.
 */
export const HIDDEN_STAY_NOTE =
  "The lead is NOT deleted. It is hidden everywhere in the app (Cold Call Desk, Leads, Pipeline) -- there is no way to find it again yet.";

/**
 * components/meetings/meeting-detail-dialog.tsx -- what a rep picks once a
 * meeting has actually happened. Replaces the old binary Done/Cancel
 * (confirmed live 2026-09-18: "Done" always sent the lead to Proposal Sent,
 * which was wrong for a meeting that didn't go anywhere -- the user wanted
 * the real range of outcomes a meeting can have). Meetings no longer leave
 * the calendar when one of these is picked (see meetings-calendar.tsx /
 * meetings/page.tsx dropping the stage filter) -- the calendar is a record
 * of every meeting that happened, tagged with its outcome, not just the
 * still-open ones. Each entry now calls the dedicated POST
 * /leads/{id}/meeting-outcome (structure-plan.md Phase 5) -- Not Interested
 * must also hide the lead, which a plain PATCH deliberately cannot do.
 */
export const MEETING_OUTCOMES: {
  stage: "won" | "proposal_sent" | "followup_due" | "lost";
  label: string;
  /** Confirmation dialog (components/ui/confirm-dialog.tsx). */
  confirmTitle: (company: string) => string;
  confirmBody: string;
  confirmLabel: string;
  /** Snackbar shown once the change is saved. */
  done: (company: string) => string;
}[] = [
  {
    stage: "won",
    label: "✅ Client Closed",
    confirmTitle: (company) => `Mark ${company} as Client Closed?`,
    confirmBody: "The lead is NOT deleted. It moves to Projects.",
    confirmLabel: "Yes, mark Client Closed",
    done: (company) => `${company} marked as Client Closed. Find it in Projects.`,
  },
  {
    stage: "proposal_sent",
    // "Proposal Send" not "Send Proposal" (user, 2026-09-22) -- matches the existing "Email Send" naming
    // pattern, and matches the Cold Call Desk's "closed" disposition, which sets this same stage.
    label: "📄 Proposal Send",
    confirmTitle: (company) => `Mark ${company} as Proposal Send?`,
    // structure-plan.md Phase 7 (reversed 2026-09-22, live-testing feedback -- "purposals sary hamary
    // pass pipline me he dekhny chahiye kahin or nhi"): Proposal Sent used to leave Pipeline for Projects
    // alongside Won. Now it stays visible in Pipeline instead -- only Won (an actually closed deal) goes
    // to Projects.
    confirmBody: "The lead is NOT deleted. It stays visible in Pipeline.",
    confirmLabel: "Yes, mark Proposal Send",
    done: (company) => `${company} moved to Proposal Sent. Find it in Pipeline.`,
  },
  {
    stage: "followup_due",
    label: "🔁 Needs Follow-up",
    confirmTitle: (company) => `Mark ${company} as Needs Follow-up?`,
    confirmBody: "The lead is NOT deleted. It moves to the Needs Follow-up list on this page, above the calendar.",
    confirmLabel: "Yes, needs follow-up",
    done: (company) => `${company} moved to Needs Follow-up, above the calendar.`,
  },
  {
    stage: "lost",
    label: "❌ Not Interested",
    confirmTitle: (company) => `Mark ${company} as Not Interested?`,
    confirmBody: HIDDEN_STAY_NOTE,
    confirmLabel: "Yes, not interested",
    done: (company) => `${company} marked Not Interested`,
  },
];

// Retired by structure-plan.md Phase 6: the Follow-up Hub page is gone. Its "After meetings" tab moved to
// components/meetings/needs-followup-list.tsx (Phase 5, see NEEDS_FOLLOWUP above); voicemail/callback
// chasing (the old "call follow-ups" tab) moved to Cold Call Desk (Phase 3). FOLLOWUPS_VIEW removed.

/** Pipeline: show the leads that already had a meeting (they sit under their stage like any other lead). */
// Retired by structure-plan.md Phase 4: Pipeline is no longer "every lead", so a Meeting-only filter
// on top of that no longer makes sense -- PIPELINE_VIEW_FILTER below replaces it.
// PIPELINE_MEETING_FILTER = { label: "Meeting Filter", all: "All leads", met: "After a meeting" }

/**
 * Pipeline (structure-plan.md Phase 4): the page itself now only ever holds four kinds of lead --
 * Callback Scheduled, Meeting Booked, Email Send, and (since 2026-09-22, reversing Phase 7 -- see
 * MEETING_OUTCOMES.proposal_sent) Proposal Sent -- so this replaces the old Stage Filter (which
 * offered all 8 stages, most of which could never appear here any more) and the old Meeting Filter.
 */
export const PIPELINE_VIEW_FILTER = {
  label: "View",
  all: "All",
  callback: "📞 Callbacks",
  meeting: "🎯 Meetings",
  email: "✉️ Email Send",
  proposal: "📄 Proposal Sent",
  // "Star" priority mark -- user request, 2026-09-23.
  starred: "⭐ Starred",
} as const;

export const PIPELINE_CARD = {
  callbackTag: (when: string) => `📞 Callback ${when}`,
  meetingTag: (when: string) => `🎯 Meeting ${when}`,
  proposalTag: "📄 Proposal Sent",
  editInContacts: "✏️ Edit in Leads",
  // Callback Scheduled dispositions that went out through an old, since-fixed button that never captured
  // a date/time -- user, 2026-09-23. Prompts a rep to set one via Edit rather than leaving the lead with
  // no visible sign it needs one.
  callbackNoTimeTag: "📞 Callback (no time set)",
} as const;

/**
 * Projects (structure-plan.md Phase 7, narrowed 2026-09-22): used to combine both closed paths --
 * Cold Call Desk's Closed and Meeting's Client Closed (stages proposal_sent and won). Proposal Sent
 * now stays in Pipeline instead (see MEETING_OUTCOMES.proposal_sent) -- Projects is Won only, so there
 * is no longer a View filter to pick between the two.
 */
export const PROJECTS_VIEW = {
  tag: { won: "🏆 Won" } as Record<string, string>,
} as const;

/**
 * Confirmation dialogs (components/ui/confirm-dialog.tsx) for anything that
 * sends a lead to Closed Lost: the three Cold Call dispositions that do it
 * (Dead Line / No Interest / Wrong Number) and choosing the Closed Lost stage.
 * Each says plainly that the lead is NOT deleted and where it stays -- the
 * team lead asked exactly that ("ye kahin to rahengi CRM me right?"), 2026-09-19.
 */
export const LOST_STAY_NOTE =
  "The lead is NOT deleted. It stays in your CRM under Pipeline → Closed Lost, and you can move it back any time.";

export const CLOSING_DISPOSITIONS: Record<
  string,
  { title: (company: string) => string; body: string; confirmLabel: string }
> = {
  dead_number: {
    title: (company) => `Mark ${company}'s number as a Dead Line?`,
    body: `The number is disconnected or bad.\n\n${HIDDEN_STAY_NOTE}`,
    confirmLabel: "Yes, dead line",
  },
  not_interested: {
    title: (company) => `Mark ${company} as No Interest?`,
    body: `They spoke with you and said no.\n\n${HIDDEN_STAY_NOTE}`,
    confirmLabel: "Yes, no interest",
  },
  wrong_number: {
    title: (company) => `Mark ${company}'s number as a Wrong Number?`,
    body: "This number does not reach the company. The lead goes back to Leads, tagged Wrong Number, until someone finds a working number.",
    confirmLabel: "Yes, wrong number",
  },
};

/**
 * "Call picked by" row (Cold Call Desk) -- structure-plan.md Phase 3. Tag only: marks who answered,
 * never changes the lead's stage or queue position. No Streamlit analogue.
 */
export const CALL_PICKED_BY = {
  heading: "Call picked by",
  options: [
    { value: "receptionist", label: "👤 Receptionist" },
    { value: "decision_maker", label: "🧑‍💼 Decision Maker" },
    { value: "team_member", label: "👥 Team Member" },
  ],
  marked: (label: string) => `Marked: ${label}`,
  failed: "Could not save who picked up. Try again.",
} as const;

/**
 * Lead edit form while it fetches the full lead (a slim list row has no outreach draft to edit -- see
 * useFullLead() in hooks/use-leads.ts). No Streamlit counterpart: app.py's form never loaded lazily.
 */
export const EDIT_FORM = {
  loading: "Loading lead…",
  loadFailed: "Could not load this lead's full details. Close this and try again.",
} as const;

/** Callback Scheduled's date/time prompt -- same shape as Booked!'s, a separate field (callback_at). */
export const CALLBACK_BOOKING = {
  prompt: "When should we call back?",
  dateLabel: "Date",
  timeLabel: "Time",
  confirm: "✅ Confirm callback",
  cancel: "Cancel",
} as const;

/** "Email Send" button (Cold Call Desk) -- structure-plan.md Phase 3/4. See lib/constants.ts SEND_TO_DESK
 * for the similarly-named but separate "Send to Cold Call Desk" (Contacts). */
export const EMAIL_SEND = {
  button: "✉️ Email Send",
  help: "Marks this lead as needing an email and moves it to Pipeline. It does not send anything -- use Mark Email Sent once you actually have.",
  sent: (company: string) => `${company} marked for email and moved to Pipeline`,
  failed: "Could not mark this lead for email. Try again.",
} as const;

/** The bottom "already tried" section and last-touch mark on Cold Call Desk cards (Phase 3). */
export const LAST_TOUCH = {
  lowPriorityHeading: (count: number) => `⏳ Voicemail & Hang Ups (${count})`,
  clickToLoad: "click to load",
  label: (when: string) => `Last activity ${when}`,
} as const;

export const LOST_STAGE_CONFIRM = {
  title: (company: string) => `Move ${company} to Closed Lost?`,
  body: LOST_STAY_NOTE,
  confirmLabel: "Yes, move to Closed Lost",
} as const;

/**
 * Snackbar copy (components/ui/toast.tsx) -- one short line per action, so the
 * rep always sees that a click registered. No Streamlit analogue: app.py used
 * st.success()/st.rerun() inline.
 */
export const TOASTS = {
  disposition: (label: string, company: string) => `${label} saved for ${company}`,
  meetingBooked: (company: string) => `Meeting booked for ${company}`,
  callbackScheduled: (company: string) => `Callback scheduled for ${company}`,
  wrongNumberSent: (company: string) => `${company}'s number was wrong -- sent back to Leads`,
  noteAdded: (company: string) => `Note added to ${company}`,
  emailMarked: (company: string) => `Email marked as sent for ${company}`,
  battlecardReady: (company: string) => `AI battlecard ready for ${company}`,
  saved: (company: string) => `Changes saved for ${company}`,
  stageChanged: (company: string, stage: string) => `${company} moved to ${stage}`,
  leadRemoved: (company: string) => `${company} was removed from the CRM`,
  leadAdded: (company: string) => `${company} was added to the CRM`,
  phoneFound: (name: string) => `Phone number found for ${name}`,
  phoneNotFound: (name: string) => `No phone number found for ${name}`,
  linkedInFound: (name: string) => `LinkedIn profile found for ${name}`,
  linkedInNotFound: (name: string) => `No LinkedIn profile found for ${name}`,
  peopleFound: (n: number) => `${n} decision maker${n === 1 ? "" : "s"} found`,
  noPeopleFound: "No decision makers found for this company",
  revealRequested: "Reveal requested. The details arrive in a few seconds.",
  linkedInResearched: (name: string) => `LinkedIn research found ${name}`,
  linkedInResearchNone: "LinkedIn research found no matching person",
  websiteFound: (company: string) => `Website found for ${company}`,
  enrichDone: "Enrichment finished",
  scanDone: "Site scan finished",
  actionFailed: "That did not work. Please try again.",
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
    { key: "followups", label: "Pipeline", color: "#f59e0b" },
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
  // structure-plan.md Phase 4: Pipeline only ever holds a lead once it has actually progressed
  // (Callback Scheduled, Meeting Booked, Email Send, or -- since 2026-09-22 -- Proposal Sent), so an
  // empty Pipeline is normal, not a sign the filters are wrong -- unlike every other empty-state
  // message on this page, which does mean "try different filters".
  pipeline:
    "Nothing here yet. A lead shows up on Pipeline once it has a callback scheduled, a meeting booked, is marked Email Send, or Proposal Sent -- everything else lives in Leads.",
  // structure-plan.md Phase 7, narrowed 2026-09-22: Projects is Won only now (Proposal Sent moved to
  // Pipeline). No Streamlit analogue.
  projects: "No projects yet. A deal shows up here once it is marked Client Closed.",
  contacts: (category: string) =>
    `No leads found under '${category}'. Use 'AI Lead Finder' or 'Add a Lead' to discover companies for this category.`,
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

/**
 * Contacts becomes the one place a lead is edited and sent onward (structure-plan.md Phase 2). No
 * Streamlit analogue -- app.py had no "which leads are ready to call" distinction at all.
 */
export const SEND_TO_DESK = {
  send: "📤 Send to Cold Call Desk",
  resend: "🔁 Resend to Cold Call Desk",
  onDesk: (when: string) => `📞 On Cold Call Desk since ${when}`,
  sent: (company: string) => `${company} sent to the Cold Call Desk`,
  failed: "Could not send this lead to the Cold Call Desk. Try again.",
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
  // Fallback only -- normally enrich.error carries the real ApiRequestError
  // message (see site-scan-panel.tsx). Confirmed live 2026-09-18: the Deep
  // Enrich button had no error branch at all, so a failed mutation silently
  // reverted to the idle button with no feedback whatsoever.
  enrichFailed: "Enrichment failed. Try again in a moment.",
} as const;
