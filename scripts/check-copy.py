"""
check-copy.py — flag user-visible copy that does not exist in the Streamlit app.

This port is meant to be a 1:1 re-skin, so any prose the frontend shows should
be findable in app.py. Paraphrasing silently changes what the sales team reads —
and it is the kind of drift a typecheck and a lint pass will never catch.

    python3 scripts/check-copy.py            # from outreach-frontend/
    python3 scripts/check-copy.py --quiet    # exit code only

Exit code is the number of unmatched strings. Expect a handful of legitimate
ones (see ALLOWED below) — the point is that each is a deliberate decision.
"""

from __future__ import annotations

import html
import re
import sys
import unicodedata
from pathlib import Path

FRONTEND = Path(__file__).resolve().parent.parent
APP_PY = FRONTEND.parent / "app.py"

SEARCH_DIRS = ["components", "app", "hooks", "lib"]

# Copy with no Streamlit counterpart, each for a stated reason.
ALLOWED = {
    # CSS media-query syntax (app/layout.tsx metadata.icons), not user-visible prose -- never rendered
    # anywhere, just picks which favicon file the browser loads for its own light/dark chrome.
    "(prefers-color-scheme: dark)",
    "(prefers-color-scheme: light)",
    # Contacts "Send to Cold Call Desk" (structure-plan.md Phase 2). No Streamlit analogue -- app.py had
    # no distinction between "in the database" and "ready to call".
    "📤 Send to Cold Call Desk",
    "🔁 Resend to Cold Call Desk",
    "Could not send this lead to the Cold Call Desk. Try again.",
    # Cold Call Desk card redesign (structure-plan.md Phase 3). No Streamlit analogue -- app.py had no
    # "call picked by" tag, no callback date/time, no hidden-everywhere state, and no Email Send flag.
    "Call picked by",
    "Could not save who picked up. Try again.",
    "When should we call back?",
    "✅ Confirm callback",
    "Marks this lead as needing an email and moves it to Pipeline. It does not send anything -- use Mark Email Sent once you actually have.",
    "Could not mark this lead for email. Try again.",
    "The lead is NOT deleted. It is hidden everywhere in the app (Cold Call Desk, Leads, Pipeline) -- there is no way to find it again yet.",
    "This number does not reach the company. The lead goes back to Leads, tagged Wrong Number, until someone finds a working number.",
    # Pipeline card redesign (structure-plan.md Phase 4) -- editing moved entirely to Contacts.
    "✏️ Edit in Leads",
    # The Contacts tab was renamed "Leads" (user request, 2026-09-22) -- this used to match app.py's own
    # "Contacts & Accounts" text verbatim; it no longer does, on purpose. (Two similar renamed strings,
    # TOASTS.wrongNumberSent and MEETING_OUTCOMES.proposal_sent.done, are backtick template literals --
    # candidates() below only extracts double-quoted strings and JSX text nodes, never those, so neither
    # one needs an entry here at all.)
    "Leads & Accounts",
    "Nothing here yet. A lead shows up on Pipeline once it has a callback scheduled, a meeting booked, or is marked Email Send -- everything else lives in Leads.",
    # Meetings page: the Needs Follow-up section above the calendar, and corrected confirm-dialog wording
    # now that Pipeline/Follow-ups no longer hold these leads (structure-plan.md Phase 5).
    "Leads you have already met and marked Needs Follow-up. Call or email again, then update the stage below.",
    "No leads are waiting after a meeting right now.",
    "The lead is NOT deleted. For now, find it in Leads (a dedicated Projects tab for closed deals is coming).",
    "The lead is NOT deleted. It moves to the Needs Follow-up list on this page, above the calendar.",
    # Projects tab (structure-plan.md Phase 7) -- new page, no Streamlit analogue.
    "Deals with a proposal sent or already won -- one status tag apart.",
    "No projects yet. A deal shows up here once it is marked Send Proposal or Client Closed.",
    "📄 Proposal Sent",
    # React needs error and loading states where Streamlit blocked and re-ran.
    "Something went wrong",
    "This view failed to load",
    "Checking services…",
    "Loading problems…",
    "Loading lead…",
    "Could not load this lead's full details. Close this and try again.",
    "Searching Hunter.io…",
    # Client-side validation Streamlit did server-side on submit.
    "Company name is required.",
    # app.py:760 initialises search_query and never assigns it — the search box
    # is new, so its placeholder has no counterpart.
    "Search company, contact, email…",
    # Metadata description; app.py has a page_title but no description.
    "3D configurator prospecting, enrichment and cold-call battlecards.",
    # Developer-facing configuration error; has no Streamlit counterpart.
    "NEXT_PUBLIC_API_URL is not set. Point it at outreach-backend, e.g.",
    # lib/verdict.ts — the CLIENT fallback for site_matches_lead, used only when
    # a ScanResult was rebuilt from persisted columns. The wording it mirrors
    # lives in agent_core.py, not app.py, and the server sends the real verdict.
    "The page returned almost no readable text, so the scan is inconclusive.",
    "This website does not match the lead — verify before calling or emailing.",
    # lib/constants.ts QUALIFY.* — the qualification funnel (grounded discovery +
    # scan + contact verification + reject-don't-save) has no Streamlit analogue.
    # app.py discovers in one ungrounded call and never rejects a lead.
    "Each company is researched on the live web, its site is scanned, and its contacts are verified before it is saved. Runs take a few minutes; leads that cannot be verified are rejected, not saved.",
    "Researching & verifying…",
    "No companies survived qualification this run. Try a broader ICP.",
    "no live website",
    "site does not match the company",
    "already has a 3D configurator",
    "no reachable contact found",
    "contact details did not validate",
    "error during qualification",
    "already in pipeline",
    "discovery could not confirm it",
    # lib/constants.ts MAPS_FINDER.* — Google Maps sourcing (Places API, no LLM
    # discovery tokens) is an alternative to AI_DISCOVERY / LEAD_FINDER, feeding
    # the same qualification funnel. No Streamlit analogue.
    "What are you searching for on Google Maps?",
    "e.g. custom golf cart dealers in Texas",
    "Search Google Maps & Verify",
    "Businesses are sourced from Google Maps instead of AI web search, then scanned and verified the same way.",
    # components/enrichment/contacts-panel.tsx — the provider-neutral contacts
    # list groups people by role and offers a per-person SignalHire reveal.
    # app.py has only a flat Hunter-only list with no grouping and no reveal.
    "Founders & owners",
    "Sales & marketing",
    "People & HR",
    "Spend one SignalHire credit for a direct email and phone",
    # lib/api/client.ts — a network-level fetch failure (backend down, wrong
    # port, or "localhost" resolving to the IPv6 loopback on Windows) is
    # named explicitly instead of surfacing a bare "TypeError: fetch failed".
    "NEXT_PUBLIC_API_URL in .env.local uses 127.0.0.1, not localhost.",
    # lib/constants.ts EMPTY_STATES.coldCallQueue — rewritten to point at Lead
    # Finder instead of the now-commented-out Apollo/CSV ingestion drawer.
    "🎯 No leads in this queue! Use Lead Finder (AI Search or Google Maps) to find new leads.",
    # components/cold-call/battlecard.tsx — phone script / objection matrix
    # generation moved from automatic (inside bulk /jobs/qualify(-maps)) to a
    # manual per-lead button, matching the existing Scan site / Reveal
    # pattern. No Streamlit analogue: app.py always generated it inline.
    "✨ Generate AI battlecard",
    # components/enrichment/site-scan-panel.tsx -- "Find website" (Google Places
    # lookup) replaces the disabled Scan site button when a lead has no
    # website yet, and its not-found message. No Streamlit analogue.
    "🔎 Find website (Google Maps)",
    "Could not find a website for this company on Google Maps.",
    # components/cold-call/battlecard.tsx -- click-to-reveal for the
    # decision-maker contacts panel (see lib/constants.ts BATTLECARD.showContacts).
    "👥 Show decision-maker contacts",
    # components/enrichment/contacts-panel.tsx -- "Find phone" (FullEnrich),
    # a third manual per-contact provider alongside Reveal/ContactOut. No
    # Streamlit analogue.
    "Find phone failed",
    "Find decision makers failed",
    # Mutation-failure fallback text added 2026-09-18 across several
    # components (battlecard.tsx, contacts-view.tsx, follow-up-list.tsx,
    # stage-select.tsx, meeting-detail-dialog.tsx, pipeline-view.tsx,
    # lib/constants.ts BATTLECARD.*Failed / SITE_SCAN.enrichFailed) -- a
    # save/update/disposition/note/enrich mutation with no onError handler
    # used to fail silently (button just reverted to idle, no feedback at
    # all). Real backend error text is shown when available; these are only
    # the fallback if the thrown error somehow isn't an Error instance. No
    # Streamlit analogue -- app.py's synchronous st.error() calls covered
    # every one of these paths already.
    "Failed to save contact info. Try again.",
    "Failed to save updates. Try again.",
    "Failed to update this lead. Try again.",
    "Failed to save the stage change. Try again.",
    "Failed to save this outcome. Try again.",
    "Failed to remove this lead. Try again.",
    "Enrichment failed. Try again in a moment.",
    "Failed to generate the battlecard. Try again.",
    "Failed to mark email sent. Try again.",
    "Failed to record this outcome. Try again.",
    "Failed to save note. Try again.",
    # Core plan Phase 1 (core-plan.md): Google Maps "call-only" checkbox in
    # Lead Finder (lib/constants.ts MAPS_FINDER.callOnly*). app.py never
    # sourced from Maps at all.
    "Also keep businesses with a phone but no website (call-only)",
    "Saved without a website scan and dialled on Google's listed business line (switchboard).",
    # Core plan Phase 3: Cold Call Desk line filter, "open now" card and the
    # local-time badge (COLD_CALL_QUEUE.*, components/leads/local-time-badge.tsx).
    # app.py never knew a lead's timezone, so none of this has a Streamlit
    # counterpart.
    "🟢 Direct lines",
    "🟡 Switchboard (gatekeeper)",
    "⚪ No usable number",
    "Open Now (Local Time)",
    "🕘 Re-sort by local time",
    "Leads whose local time is inside business hours come first. Order only refreshes when you click this, so cards don't jump while you work.",
    # Core plan Phase 6/9: per-contact free LinkedIn search in the contacts
    # panel (lib/constants.ts CONTACT_LOOKUP). No Streamlit analogue.
    "🔎 Find LinkedIn (free)",
    "Free web search for this person's LinkedIn profile. No credits are spent.",
    "🔎 No LinkedIn profile found for this person.",
    "LinkedIn search failed. Try again.",
    "Tip: run Find LinkedIn (free) first. A LinkedIn URL gives Find phone the best chance of a match.",
    # 2026-09-19: in-app confirmation dialogs (components/ui/confirm-dialog.tsx)
    # replacing the browser's confirm(), and snackbars (components/ui/toast.tsx)
    # for every action -- the team lead could not tell what "Closed Lost" did.
    # lib/constants.ts MEETING_OUTCOMES.confirm*/TOASTS.*, pipeline-view.tsx
    # Remove. app.py used st.success()/st.rerun() inline and had no dialogs.
    "The lead is NOT deleted. It stays in your CRM under Pipeline → Deal Won.",
    "The lead is NOT deleted. It stays in your CRM under Pipeline → Proposal Sent.",
    "The lead is NOT deleted. It moves to the Follow-ups page so you can call again.",
    "The lead is NOT deleted. It stays in your CRM under Pipeline → Closed Lost, and you can move it back any time.",
    "Yes, mark Client Closed",
    "Yes, mark Send Proposal",
    "Yes, needs follow-up",
    "Yes, not interested",
    "Yes, delete permanently",
    # Follow-ups find-it tools (lib/constants.ts FOLLOWUPS_VIEW). No Streamlit analogue.
    "Search Follow-ups",
    "Company, contact or email…",
    "Recently updated first",
    "Yes, dead line",
    "Yes, no interest",
    "Yes, wrong number",
    "Yes, move to Closed Lost",
    "Enrichment finished",
    "Site scan finished",
    "No decision makers found for this company",
    "That did not work. Please try again.",
    "Reveal requested. The details arrive in a few seconds.",
    "LinkedIn research found no matching person",
    "Dismiss notification",
    "🕘 Local time unknown",
    "This number has no single timezone (toll-free or a multi-zone area code)",
    "Inside local business hours",
    "Outside local business hours",
    "Look up a mobile phone number via FullEnrich (up to 10 credits, only charged on a match)",
    # Explicit "no match" feedback -- a miss is a normal 200, not an error,
    # so without this a rep saw nothing happen and could reasonably retry,
    # risking a second real credit spend (confirmed live 2026-09-17).
    "📵 No mobile number found for this contact.",
    # Display label for a scraped role mailbox with no named person behind it
    # (contact_ingest.py _ROLE_LABEL_BY_BUCKET) -- used here only to exclude
    # it from the Find phone button, not shown as new copy.
    "Leadership Desk",
    # New Meetings tab (lib/constants.ts PAGE_HEADERS.meetings, MEETING_BOOKING)
    # -- app.py never tracked a meeting date/time at all, so none of this has
    # a Streamlit counterpart.
    "Every meeting your team has booked, laid out on the calendar.",
    "When is the meeting?",
    "✅ Confirm booking",
    # MEETING_OUTCOMES (lib/constants.ts) -- the 4-way outcome picker a rep
    # uses to tag a meeting after it happens (2026-09-18, replaced a binary
    # Done/Cancel). app.py never tracked meeting outcomes at all.
    "✅ Client Closed",
    "📄 Send Proposal",
    "🔁 Needs Follow-up",
    "❌ Not Interested",
    # New Country filter (lib/constants.ts COUNTRIES, pipeline-view.tsx) --
    # app.py had no country field at all, so none of this has a Streamlit
    # counterpart. Only the multi-word country names get flagged (is_prose
    # requires len>=14 and a space); the rest of COUNTRIES is unaffected.
    "Country Filter",
    "🇦🇪 United Arab Emirates",
    "🇨🇭 Switzerland",
    "🇨🇿 Czech Republic",
    "🇬🇧 United Kingdom",
    "🇳🇱 Netherlands",
    "🇳🇿 New Zealand",
    "🇸🇦 Saudi Arabia",
    "🇺🇸 United States",
    "🇿🇦 South Africa",
    # New lead-source badge/filter (lib/format.ts leadSource(), lib/constants.ts
    # LEAD_SOURCE_LABELS) -- app.py never showed or filtered on where/how a
    # lead was added, so none of this has a Streamlit counterpart. The two
    # format.ts strings are exact-match keys against source_prompt (see
    # qualify.py / lead_engine.py), not copy shown to a user directly.
    "🧑‍💼 Sales Team",
    "🤖 AI Generated",
    "🗺️ Google Maps Generated",
    "CSV Batch Import",
    "Google Maps sourcing:",
    # Pipeline/Contacts edit panels -- warns before a "Meeting Booked" stage
    # save with no date/time (silently invisible on the Meetings tab; see
    # docs.md 2026-09-16). No Streamlit analogue, app.py never had this stage.
    "Set both Date and Time — without them this lead is staged as Meeting Booked but will not appear on the Meetings tab.",
    # add-lead-popover.tsx's inline form-validation error for the same case.
    "Set both Date and Time for a lead staged as Meeting Booked.",
    # New "Mark Email Sent" action and "Receptionist" disposition
    # (lib/constants.ts BATTLECARD/DISPOSITIONS, call_events.py) -- app.py had
    # no email-send confirmation and only 4 disposition buttons, neither has
    # a Streamlit counterpart.
    "✅ Mark Email Sent",
    "Email marked sent!",
    "👤 Receptionist",
    "Reached the receptionist/gatekeeper, not a decision maker. Keeps in Follow-up queue.",
    # New "Decision Maker" disposition (replaces the old derived Today/This-
    # Week count of the same name with a real button, per user request
    # 2026-09-17) -- same reasoning as Receptionist above, no Streamlit
    # counterpart.
    "🧑‍💼 Decision Maker",
    "Spoke with the decision maker directly, no outcome yet. Keeps in Follow-up queue.",
    # 3 more dispositions the user asked for directly from a reference call-
    # desk tool's button list (No Answer, Hang Up, Irrelevant) -- same
    # reasoning as Receptionist/Decision Maker above, no Streamlit counterpart.
    "Phone rang, nobody picked up. Keeps in Follow-up queue.",
    "Call connected then was hung up before any conversation. Keeps in Follow-up queue.",
    # "Irrelevant" renamed to "Wrong Number", and "Closed" added, per user
    # request 2026-09-17 -- same reference button list as above.
    "📵 Wrong Number",
    "This number doesn't reach the company at all. Removes from queue.",
    # "Closed" corrected 2026-09-17: NOT "business shut down" (a wrong first
    # reading) -- confirmed live it means the client is closing the deal, a
    # positive outcome that advances the lead to Proposal Sent.
    "Client is closing the deal, not final yet. Advances to Proposal Sent.",
    # job-progress.tsx: the old "Complete — N leads processed" message
    # claimed N (the REQUESTED count, set before the run even started) as if
    # it were the actual outcome -- a run that found zero leads (e.g. quota
    # exhausted) showed this green success line directly above the caller's
    # own red error message, visibly contradicting it (confirmed live
    # 2026-09-17). Now neutral; each caller's own result summary (already
    # reading job.result) is the one source of truth for what actually
    # happened.
    "✅ Job finished.",
    # follow-up-list.tsx: new Reason+Source filter combo on Follow-ups (per
    # user request 2026-09-18) needed its own "no results" message, distinct
    # from EMPTY_STATES.followUps ("queue itself is empty") -- no Streamlit
    # counterpart, this filter combination didn't exist there.
    "No follow-ups match this filter combination. Try 'All Reasons' or 'All Sources'.",
    # add-lead-popover.tsx: "+ Add Another Contact" -- per user request
    # 2026-09-18, same multi-contact idea CSV Import now has. No Streamlit
    # counterpart, app.py's Add Lead form only ever had one contact.
    "+ Add Another Contact",
    # ACTIVITY_SCROLLER "Today" card label -- clarifies this counts only
    # manually-added (Sales Team) leads, not AI/Maps/CSV-discovered ones.
    "Sales Team Leads",
    # Add a Lead: Category and Country are now required, not silently
    # defaulted (see add-lead-popover.tsx EMPTY.industry_tag comment). No
    # Streamlit analogue -- app.py always had a default category and no
    # country field at all.
    "Industry Category *",
    "Select a category",
    "Select a country",
    "Select an Industry Category and a Country before saving.",
    # Sign-in, per-person team activity and @mentions/notifications: app.py had no login, no users and
    # no per-person tracking, so none of this copy has a Streamlit counterpart (auth-plan.md).
    "Sign in with your approved team email.",
    "Only approved team emails can create an account.",
    "Create your account",
    "Create account",
    "Confirm password",
    "The two passwords do not match.",
    "New here? Create an account",
    "Already have an account? Sign in",
    "Can't reach the server right now. Try again in a moment.",
    "Signing you in…",
    "Sign-in failed. Please try again.",
    "Local testing only: sign in by email (no Google)",
    "Sign in (test)",
    "No activity yet today. Rows appear as people sign in and start calling.",
    "Before tracking started (no per-person data)",
    "is activity recorded before sign-in existed. It is counted in the team total.",
    "Nothing recorded yet.",
    "Recent Activity",
    "Show activity for",
    "📅 Weekly Report",
    "📊 Google Sheet history",
    "The Google Sheet history is not available right now.",
    "✉️ Marked an email as sent",
    "📝 Added a note",
    "Everyone on the team",
    "Notifies every signed-in teammate",
    "Type @ to mention a teammate, or @team for everyone. They get a notification.",
    "Nothing yet. When someone mentions you, it shows up here.",
    "Could not load notifications.",
    "Tell the team (optional)",
    "e.g. @Ilhan please try this one, owner wants a quote",
    # Sign-in / create-account form: field errors (zod, lib/validation/auth.ts), the password checklist and the
    # login side panel. Same no-Streamlit-analogue reason as the block above.
    "Enter a valid email address.",
    "Enter your email address.",
    "Enter your name (at least 2 characters).",
    "Enter your password.",
    "Enter the invite code.",
    "Type the password again.",
    "That name is too long.",
    "That password is too long.",
    "Use only letters, spaces and . , ' - in your name.",
    "One uppercase letter (A-Z)",
    "One lowercase letter (a-z)",
    "One number (0-9)",
    "an uppercase letter",
    "a lowercase letter",
    "Password requirements",
    "Passwords match",
    "Sign in instead",
    "e.g. Ayesha Khan",
    "Ask your admin for the team invite code.",
    "Your team's calling desk, in one place.",
    "Every call, note and stage change is saved under the person who did it.",
    "A daily and weekly report for each person on the team.",
    # Post-meeting follow-ups shown separately + the Pipeline meeting filter (team lead, 2026-09-21). app.py had
    # one flat follow-up list and no meeting date at all.
    "Follow-up lists",
    "The lead is NOT deleted. It moves to Follow-ups → After meetings so you can call again, and stays in Pipeline.",
    "After a meeting",
    "Meeting Filter",
    "Move in Pipeline",
    "Leads still being chased by phone or email. No meeting yet.",
    "Leads you have already met. They stay in your Pipeline under their stage; move them on from here.",
    "No call follow-ups right now.",
    "No leads are waiting after a meeting. On the Meetings page, pick Needs Follow-up or Send Proposal once a meeting is done and the lead shows up here.",
    # Proposal Sent moved from Projects back to Pipeline (live-testing feedback, 2026-09-22 -- "purposals
    # sary hamary pass pipline me he dekhny chahiye kahin or nhi"), reversing structure-plan.md Phase 7.
    # No Streamlit analogue for either destination.
    "Deals that have been won -- Client Closed.",
    "No projects yet. A deal shows up here once it is marked Client Closed.",
    "Nothing here yet. A lead shows up on Pipeline once it has a callback scheduled, a meeting booked, is marked Email Send, or Proposal Sent -- everything else lives in Leads.",
    "The lead is NOT deleted. It moves to Projects.",
    "The lead is NOT deleted. It stays visible in Pipeline.",
    # "Proposal Send" not "Send Proposal" (user, 2026-09-22) -- matches the existing "Email Send"
    # naming pattern. Same rename on both the Meeting popup's outcome button and the Cold Call
    # Desk's "closed" disposition, since both set the same proposal_sent stage.
    "📄 Proposal Send",
    "Yes, mark Proposal Send",
    # Compact on/off theme switch in the top bar, replacing the sidebar's two big Light/Dark buttons
    # (user, 2026-09-23). No Streamlit analogue for either wording.
    "Switch to dark theme",
    "Switch to light theme",
    # Leads page's "Active Sector Overview" card replaced with a "Today's Leads" / "This Week's Leads"
    # block (user, 2026-09-22 -- "yeh jo hai is ko hata do... todays leads or this week leads ki block
    # bana kr woh show krwao"). No Streamlit analogue for either wording.
    "📅 Today's Leads",
    "🗓️ This Week's Leads",
    # Pipeline quick actions (user, 2026-09-22 -- "har lead pr Not intrested, purposal send or meeting
    # booked or project closed yeh action yhn bhi hone chahiye"). The other 3 actions reuse
    # MEETING_OUTCOMES' existing labels/copy verbatim; only this one (opens the date/time prompt) is new.
    "🎯 Meeting Booked",
    # "Star" priority mark (user, 2026-09-23 -- "star mark kr dy... yeh sirf mark hai koi action nhi").
    # No Streamlit analogue. LeadCard's toggle button title/aria-label text.
    "Mark as priority",
    "Mark this lead as priority",
    "Unstar this lead",
    # Callback Scheduled leads with no callback_at (an old, since-fixed button never captured a date/time
    # -- see docs.md 2026-09-23). Pipeline now shows them anyway with this tag, prompting a rep to set the
    # real time via Edit. No Streamlit analogue.
    "Callback Scheduled, but no date/time was captured -- set one via Edit.",
    "📞 Callback (no time set)",
}

CLASS_HINT = re.compile(
    r"\b(flex|grid|rounded|border|bg-|text-\[|text-muted|text-accent|text-white|px-|py-|pt-|pb-|"
    r"mt-|mb-|ml-|gap-|font-|hover:|focus:|data-\[|min-w|max-w|overflow|absolute|relative|items-|"
    r"justify-|cursor-|shadow-\[|w-full|h-\[|shrink|truncate|whitespace|leading-|tracking-|"
    r"accent-|opacity-|z-\d|sm:|md:|lg:|block text|solid var\(|animate-)"
)
CODE_FRAG = re.compile(
    r"[{}<>=|]|&&|\?\s|\bconst\b|\bclassName\b|noopener|noreferrer|\bsp\.|\bp\.\w|\$\{"
    r"|setAttribute\(|localStorage|document\.|matchMedia|\breturn\b"
)


def norm(text: str) -> str:
    """Fold the differences that are formatting, not wording."""
    text = html.unescape(text)
    text = unicodedata.normalize("NFKC", text)
    for a, b in [
        ("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'),
        ("—", "-"), ("–", "-"), ("…", "..."), (" ", " "),
    ]:
        text = text.replace(a, b)
    # Streamlit markdown bold/italic markers are not part of the wording.
    text = text.replace("**", "").replace("__", "")
    return re.sub(r"\s+", " ", text).strip().lower()


def is_prose(s: str) -> bool:
    if len(s) < 14 or " " not in s:
        return False
    if s[0] in "#/@.":
        return False
    if s.startswith(("http", "var(", "use ")):
        return False
    if CLASS_HINT.search(s) or CODE_FRAG.search(s):
        return False
    return sum(c.isalpha() for c in s) >= len(s) * 0.5


def candidates(src: str) -> set[str]:
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"^\s*//.*$", "", src, flags=re.M)
    found: set[str] = set()
    # Quoted literals.
    found |= set(re.findall(r'"([^"\n]{14,300})"', src))
    # Single-line JSX text nodes.
    found |= set(re.findall(r">([^<>{}\n]{14,300})<", src))
    # Multi-line JSX text nodes: a run of plain lines between tags. Without this
    # a paraphrase that happens to sit on its own line slips through. (The first char excludes
    # whitespace so it cannot overlap \s* -- that overlap backtracked exponentially on some files.)
    for block in re.findall(r">\n((?:\s*[^<>{}\s][^<>{}\n]*\n)+)\s*</", src):
        joined = " ".join(line.strip() for line in block.splitlines() if line.strip())
        if joined:
            found.add(joined)
    return found


def main() -> int:
    quiet = "--quiet" in sys.argv
    if not APP_PY.exists():
        print(f"ERROR: {APP_PY} not found — run this from outreach-frontend/")
        return 1

    app_n = norm(APP_PY.read_text(encoding="utf-8"))
    allowed_n = {norm(a) for a in ALLOWED}

    files = [
        p
        for d in SEARCH_DIRS
        for p in (FRONTEND / d).rglob("*.ts*")
        if "node_modules" not in p.parts
    ]

    misses: dict[str, set[str]] = {}
    for f in sorted(files):
        for c in candidates(f.read_text(encoding="utf-8")):
            c = c.strip()
            if not is_prose(c):
                continue
            n = norm(c)
            if n in app_n or n in allowed_n:
                continue
            misses.setdefault(str(f.relative_to(FRONTEND)), set()).add(c)

    total = sum(len(v) for v in misses.values())
    if not quiet:
        for f in sorted(misses):
            print(f"── {f}")
            for c in sorted(misses[f]):
                print(f"     {c!r}")
        print()
        print(f"{total} string(s) not found in app.py and not in the allow-list.")
        if total:
            print("Either copy the wording from app.py, or add it to ALLOWED with a reason.")
        else:
            print("All user-visible copy traces back to app.py.")
    return total


if __name__ == "__main__":
    sys.exit(main())
