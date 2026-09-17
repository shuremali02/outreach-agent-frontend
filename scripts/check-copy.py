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
