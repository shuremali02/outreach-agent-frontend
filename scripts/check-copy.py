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
    # React needs error and loading states where Streamlit blocked and re-ran.
    "Something went wrong",
    "This view failed to load",
    "Checking services…",
    "Loading problems…",
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
}

CLASS_HINT = re.compile(
    r"\b(flex|grid|rounded|border|bg-|text-\[|text-muted|text-accent|text-white|px-|py-|pt-|pb-|"
    r"mt-|mb-|ml-|gap-|font-|hover:|focus:|data-\[|min-w|max-w|overflow|absolute|relative|items-|"
    r"justify-|cursor-|shadow-\[|w-full|h-\[|shrink|truncate|whitespace|leading-|tracking-|"
    r"accent-|opacity-|z-\d|sm:|md:|lg:|block text|solid var\()"
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
    # a paraphrase that happens to sit on its own line slips through.
    for block in re.findall(r">\n((?:\s*[^<>{}\n][^<>{}\n]*\n)+)\s*</", src):
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
