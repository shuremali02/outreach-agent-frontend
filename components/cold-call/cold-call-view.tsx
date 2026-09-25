"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLeads } from "@/hooks/use-leads";
import { leadsApi } from "@/lib/api";
import { Loader } from "@/components/ui/loader";
import { Battlecard } from "./battlecard";
// Re-enabled: the CSV Import tab is how a spreadsheet gets uploaded +
// enriched (File > Download > CSV from Google Sheets/Excel, then drop the
// .csv here). Its own Apollo tab stays commented out inside
// ingest-drawer.tsx (no paid key, not used) -- only "AI Discovery" and "CSV
// Import" render now.
import { IngestDrawer } from "@/components/ingest/ingest-drawer";
import { TickerCard } from "@/components/metrics/ticker-card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  CALL_WINDOW,
  ALL_CATEGORIES,
  ALL_COUNTRIES,
  ALL_SOURCES,
  UNKNOWN_COUNTRY,
  STANDARD_CATEGORIES,
  COUNTRIES,
  LEAD_SOURCE_LABELS,
  COLD_CALL_QUEUE,
  LAST_TOUCH,
} from "@/lib/constants";
import { currency, leadSource, localClock, num } from "@/lib/format";
import type { Lead } from "@/types";
import { EMPTY_STATES } from "@/lib/constants";
import { stripEmoji, withIcons } from "@/components/ui/emoji-icon";

// Module-level, not component-scoped: a `new Set(...)` recreated every render was never referentially
// stable, so the lint rule correctly flagged it as unusable in a useMemo dependency array -- adding it
// would have defeated the memo (it "changes" every render). The set of outcomes itself never changes.
const TRIED_OUTCOMES = new Set(["voicemail", "hang_up"]);

// Stages that belong to Pipeline / Projects / closed, never to this desk -- mirrors DESK_EXCLUDED_STAGES in
// the backend (crud/leads.py). Also applied here because a lead edited to one of them stays in the cached
// desk list until the next refetch.
const NOT_ON_DESK_STAGES = new Set(["contacted", "meeting_booked", "proposal_sent", "won", "lost"]);

/** "direct" (a person's verified line) | "switchboard" (business line) | "none". */
function lineOf(l: Lead): string {
  if (!l.contact_phone) return "none";
  if (l.phone_status === "verified_direct") return "direct";
  if (l.phone_status === "switchboard") return "switchboard";
  return "none";
}

export function ColdCallView({ initialLeads, q }: { initialLeads: Lead[]; q: string }) {
  // Full rows, not slim: every card here shows the phone script and objections (and the mailto body), and
  // 139 cards each fetching their own full lead would be far worse than one bigger list.
  // Only the desk's own leads (filtered in SQL, not in the browser), and NOT the Voicemail / Hang Up group:
  // that one is fetched only once the rep opens its section below ("Already Tried"), so it is not
  // downloaded on every visit. These filters must match app/(workspace)/cold-call/page.tsx exactly.
  const { data: mainLeads = [] } = useLeads({ q, slim: false, onDesk: true, tried: false }, initialLeads);
  const qc = useQueryClient();
  const [showTried, setShowTried] = useState(false);
  const triedRef = useRef<HTMLDivElement>(null);
  const tried = useLeads({ q, slim: false, onDesk: true, tried: true }, undefined, showTried);
  // The collapsed section still says how many are waiting -- one COUNT query, not the rows.
  const triedCount = useQuery({
    queryKey: ["desk-tried-count", q],
    queryFn: () => leadsApi.deskTriedCount(q),
    staleTime: 60_000,
  });
  const triedTotal = triedCount.data?.count ?? 0;
  const allLeads = useMemo(() => {
    const byId = new Map<number, Lead>();
    for (const l of mainLeads) byId.set(l.id, l);
    for (const l of tried.data ?? []) byId.set(l.id, l);
    return [...byId.values()];
  }, [mainLeads, tried.data]);

  // Search moved here from the shared TopBar (user, 2026-09-23: "jo yeh search bar hai isko iski jaga
  // yahan neechy ly ao") -- same debounced ?q= URL-sync logic top-bar.tsx used for this route, just
  // rendered next to "Re-sort by local time" instead. top-bar.tsx no longer renders it on /cold-call.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ);
    setSearch(urlQ);
  }
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pathname]);

  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [country, setCountry] = useState(ALL_COUNTRIES);
  // Derived from source_prompt (leadSource()), not a real backend filter --
  // filtered client-side same as category/country here.
  const [source, setSource] = useState(ALL_SOURCES);
  // Which kind of number the lead is dialled on -- see phone_status_for()
  // (backend): verified_direct = a person's line, switchboard = a business
  // line that reaches a receptionist, anything else = no usable number.
  const [line, setLine] = useState("all");
  // Snapshot used ONLY for ordering. Re-sorting on a live clock would shuffle
  // cards under a rep mid-call; the order refreshes on mount, on a filter
  // change, or when the rep clicks "Re-sort by local time".
  const [sortAt, setSortAt] = useState(() => Date.now());

  // Confirmed live 2026-09-18: a disposition on a lead already in the
  // Follow-up section (e.g. a 2nd Voicemail) keeps it at followup_due --
  // same section, same position, nothing visibly changes -- so a rep had no
  // way to tell the click actually registered, and sometimes pressed it
  // again. Any disposition now hides that lead from this view immediately,
  // regardless of which stage it lands in server-side; a real refetch would
  // otherwise just bring an unresolved follow-up right back.
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  function dismiss(leadId: number) {
    setDismissed((prev) => (prev.has(leadId) ? prev : new Set(prev).add(leadId)));
    // A Voicemail / Hang Up outcome moves the lead into the (possibly unloaded) tried group: keep its count honest.
    qc.invalidateQueries({ queryKey: ["desk-tried-count"] });
  }

  /**
   * structure-plan.md Phase 3 -- the desk's own membership rule: a lead is here once Contacts explicitly
   * sends it (sent_to_desk_at), full stop. Not stage-based any more. apply_call_outcome() (backend)
   * clears sent_to_desk_at the moment a call outcome or Email Send takes a lead elsewhere (Wrong Number
   * -> Contacts, Callback/Meeting/Closed -> Pipeline), so this list only ever needs the one field.
   */
  const queue = useMemo(
    () => allLeads.filter((l) => Boolean(l.sent_to_desk_at) && !NOT_ON_DESK_STAGES.has(l.pipeline_stage)),
    [allLeads],
  );

  const filtered = useMemo(
    () =>
      queue.filter(
        (l) =>
          !dismissed.has(l.id) &&
          (category === ALL_CATEGORIES || l.industry_tag === category) &&
          (country === ALL_COUNTRIES ||
            (country === UNKNOWN_COUNTRY ? !l.country : l.country === country)) &&
          (source === ALL_SOURCES || leadSource(l.source_prompt) === source) &&
          (line === "all" || lineOf(l) === line),
      ),
    [queue, dismissed, category, country, source, line],
  );

  // 0 = at their desk right now, 1 = timezone unknown, 2 = outside hours; then
  // direct lines before switchboards before no-number. A stable tiebreak on
  // the old order (below) keeps everything else exactly as it was.
  const rank = useMemo(() => {
    const at = new Date(sortAt);
    return (l: Lead) => {
      const clock = localClock(l.call_tz, at, CALL_WINDOW.startHour, CALL_WINDOW.endHour);
      const timeRank = clock === null ? 1 : clock.open ? 0 : 2;
      const lane = lineOf(l);
      // No usable number = nothing to dial: last, whatever the time there is.
      if (lane === "none") return 100 + timeRank;
      return timeRank * 10 + (lane === "direct" ? 0 : 1);
    };
  }, [sortAt]);

  // Three groups, not one flat list -- structure-plan.md Phase 3. No Answer stays in its normal
  // (middle) position; Voicemail/Hang Up sink to the bottom, oldest-touched first within that group (the
  // one waiting longest surfaces first, ready to try again); everything else on the desk (never called,
  // or re-sent from Contacts after some other outcome) is "New". New leads sort newest-first so the
  // latest batch is always at the top.
  const noAnswerLeads = useMemo(
    () =>
      filtered
        .filter((l) => l.last_call_outcome === "no_answer")
        .sort((a, b) => rank(a) - rank(b) || a.updated_at.localeCompare(b.updated_at)),
    [filtered, rank],
  );
  const triedLeads = useMemo(
    () =>
      filtered
        .filter((l) => TRIED_OUTCOMES.has(l.last_call_outcome))
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at)),
    [filtered],
  );
  const newLeads = useMemo(
    () =>
      filtered
        .filter((l) => l.last_call_outcome !== "no_answer" && !TRIED_OUTCOMES.has(l.last_call_outcome))
        .sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at)),
    [filtered, rank],
  );

  const verifiedLines = queue.filter(
    (l) => l.phone_status === "verified_direct" && l.contact_phone,
  ).length;
  const queueValue = queue.reduce((s, l) => s + l.deal_value, 0);
  const openNow = useMemo(() => {
    const at = new Date(sortAt);
    // Only leads with a number to dial: a no-number lead can carry a timezone
    // (from its country) but is never "ready to call".
    return queue.filter(
      (l) =>
        lineOf(l) !== "none" &&
        localClock(l.call_tz, at, CALL_WINDOW.startHour, CALL_WINDOW.endHour)?.open,
    ).length;
  }, [queue, sortAt]);

  return (
    <>
      <IngestDrawer />

      <div className="mb-5 grid grid-cols-5 gap-3">
        <TickerCard
          label="Call-Ready Queue"
          value={num(mainLeads.filter((l) => l.sent_to_desk_at).length + triedTotal)}
          size="md"
        />
        <TickerCard
          label="Verified Direct Lines"
          value={num(verifiedLines)}
          size="md"
          valueColor="success"
        />
        <TickerCard
          label={COLD_CALL_QUEUE.openNowCard}
          value={num(openNow)}
          size="md"
          valueColor="success"
        />
        <TickerCard
          label="Queue Pipeline Value"
          value={currency(queueValue)}
          size="md"
          valueColor="accent"
        />
        <TickerCard label="Dialing Efficiency" value="0s" size="md" valueColor="info" />
      </div>

      <div className="mb-4 grid grid-cols-4 gap-4">
        <Field label="Category Filter">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value={ALL_CATEGORIES}>{stripEmoji(ALL_CATEGORIES)}</option>
            {STANDARD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {stripEmoji(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country Filter">
          <Select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value={ALL_COUNTRIES}>{stripEmoji(ALL_COUNTRIES)}</option>
            <option value={UNKNOWN_COUNTRY}>Unknown</option>
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {stripEmoji(c.label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source Filter">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value={ALL_SOURCES}>{stripEmoji(ALL_SOURCES)}</option>
            {Object.entries(LEAD_SOURCE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {stripEmoji(label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={COLD_CALL_QUEUE.lineFilterLabel}>
          <Select
            value={line}
            onChange={(e) => {
              setLine(e.target.value);
              setSortAt(Date.now());
            }}
          >
            {COLD_CALL_QUEUE.lineOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {stripEmoji(o.label)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, contact, email…"
          aria-label="Search leads"
          className="w-[28rem]"
        />
        <div className="flex items-center gap-2">
          {/* The section itself sits at the bottom (after every New / Follow-up card) -- this jumps to it. */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowTried(true);
              triedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {withIcons(LAST_TOUCH.lowPriorityHeading(triedTotal))}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            title={COLD_CALL_QUEUE.resortHelp}
            onClick={() => setSortAt(Date.now())}
          >
            {withIcons(COLD_CALL_QUEUE.resort)}
          </Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p
          className="rounded-[8px] px-3 py-2 text-[0.9rem]"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          {withIcons(EMPTY_STATES.coldCallQueue)}
        </p>
      )}

      {newLeads.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-[1.05rem] font-semibold">
            {withIcons(COLD_CALL_QUEUE.newHeading(newLeads.length))}
          </h3>
          {newLeads.map((lead) => (
            <Battlecard key={lead.id} lead={lead} onActionTaken={dismiss} />
          ))}
        </div>
      )}

      {noAnswerLeads.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-[1.05rem] font-semibold">
            {withIcons(COLD_CALL_QUEUE.followUpHeading(noAnswerLeads.length))}
          </h3>
          {noAnswerLeads.map((lead) => (
            <Battlecard key={lead.id} lead={lead} onActionTaken={dismiss} />
          ))}
        </div>
      )}

      {/* Always rendered, even at 0 or if the count request failed -- hiding it made it look missing. */}
      {(
        <div ref={triedRef} className="scroll-mt-4">
          <button
            type="button"
            onClick={() => setShowTried((v) => !v)}
            aria-expanded={showTried}
            className="mb-2 flex cursor-pointer items-center gap-2 text-left text-[1.05rem] font-semibold hover:text-accent"
          >
            <span className="text-[0.8rem] text-muted" aria-hidden>
              {showTried ? "▾" : "▸"}
            </span>
            {withIcons(LAST_TOUCH.lowPriorityHeading(showTried && tried.data ? triedLeads.length : triedTotal))}
            {showTried && tried.isFetching && <Loader className="h-4 w-4" />}
            {!showTried && <span className="text-[0.8rem] font-normal text-muted">{withIcons(LAST_TOUCH.clickToLoad)}</span>}
          </button>
          {showTried && triedLeads.map((lead) => (
            <Battlecard key={lead.id} lead={lead} onActionTaken={dismiss} />
          ))}
        </div>
      )}
    </>
  );
}
