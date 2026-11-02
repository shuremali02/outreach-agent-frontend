"use client";

import { useState } from "react";
import { Circle, CircleCheck, CircleX, Star } from "lucide-react";
import { telUrl } from "@/lib/format";
import { Ico } from "@/components/ui/emoji-icon";
import { Loader } from "@/components/ui/loader";
import { usePhoneMark } from "@/hooks/use-leads";
import { useToast } from "@/components/ui/toast";
import { TOASTS } from "@/lib/constants";

/**
 * Splits a comma-joined phone field (a contact/lead can now carry several --
 * see lead_engine.py's _all_phones()) into individually callable AND
 * copyable numbers. Confirmed live 2026-09-18: showing them all crammed into
 * one tel: link/text block dialed only the first one and gave no way to
 * reach or copy any of the others.
 *
 * Per-number marks (2026-11-02, user: "numbers k agy tick check mark laga dety hein jese he user us ko
 * check krdy toh usy call card me count kr dyngy... or usi numbers k agy ya peechy hum ek chota cross or
 * star check laga dyn mtlb agar star toh number valid or good ha or second agar cross toh woh number
 * wrong ya dead ha") -- THREE separate marks per number, not one combined click: a plain ✅ tick (dialed,
 * counts toward "Numbers Called", no verdict yet), and a ⭐/❌ pair for the good/wrong verdict (also
 * counts as called, plus the verdict). Only rendered when `leadId` is given (Cold Call Desk's
 * battlecard.tsx passes it; every other caller does not, so nothing changes for them). `marks` rides
 * along on the already-fetched `Lead` object (Lead.phone_marks) -- deliberately NOT a separate per-card
 * fetch, since Cold Call Desk renders many Battlecards open at once and an unconditional per-card GET
 * here would repeat the exact QueuePool-exhaustion incident contacts-panel.tsx's own comment documents.
 */
export function PhoneNumberList({
  phones,
  size = "compact",
  leadId,
  marks,
}: {
  phones: string;
  /** "button" = the big green Battlecard dialer; "compact" = a small inline
   * list, e.g. the Contacts/Decision Makers panel. */
  size?: "compact" | "button";
  /** Enables the tick/good/wrong mark buttons for this lead's numbers. Omit to render exactly as before. */
  leadId?: number;
  /** Lead.phone_marks -- {phone_number: "called" | "good" | "wrong"}. */
  marks?: Record<string, "called" | "good" | "wrong">;
}) {
  const numbers = phones
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (numbers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {numbers.map((n, i) => (
        // index in the key too -- a sheet/CSV row can legitimately list the
        // same number twice, and "n" alone would collide.
        <PhoneRow key={`${i}-${n}`} number={n} big={size === "button"} leadId={leadId} status={marks?.[n]} />
      ))}
    </div>
  );
}

function PhoneRow({
  number,
  big,
  leadId,
  status,
}: {
  number: string;
  big: boolean;
  leadId?: number;
  status?: "called" | "good" | "wrong";
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  // usePhoneMark() (hooks/use-leads.ts) patches the returned Lead straight into every cached ["leads",
  // ...] list in place -- no refetch round trip. The inline version of this mutation used a raw
  // qc.invalidateQueries({queryKey:["leads"]}), which refetches the whole leads table on every click --
  // exactly the "har button bohut time ly rha hai" anti-pattern useInvalidate's own comment documents,
  // and exactly what the user hit here too (2026-11-02: "in actions kafi slow hain... action click hone
  // k itni der bad ja kr state change ho ri ha").
  const mark = usePhoneMark();
  // Which of the 3 buttons is currently in flight (2026-11-02, user: "button icon click hone k bad agar
  // time ly rha hai loading laga do us pr taky bar bar click na krta rhy... 2 5 seconds lye toh utny load
  // ho rha ho woh") -- `mark` is shared by all 3 buttons on this row, so this tracks which one the rep
  // actually clicked, to spin only that one; all 3 are disabled together while any mutation is in flight,
  // so a second click can't fire a race against the first.
  const [active, setActive] = useState<"tick" | "star" | "cross" | null>(null);
  function toggle(button: "tick" | "star" | "cross", next: "called" | "good" | "wrong" | null) {
    setActive(button);
    mark.mutate(
      { leadId: leadId!, phoneNumber: number, status: next },
      {
        onSettled: () => setActive(null),
        onError: (e) => toast.error(e instanceof Error ? e.message : TOASTS.actionFailed),
      },
    );
  }

  // Real lucide icons here (not the shared `Ico`/emoji TONE map) -- `Ico` hardcodes a fixed colour per
  // emoji via an inline `style`, which wins over any className on the wrapping button, so "⭐"/"❌" used
  // to render the exact same colour whether marked or not, and a plain outline character for "unmarked"
  // rendered as a full-size coloured OS emoji glyph instead of a small muted icon (confirmed live,
  // 2026-11-02 screenshots: "mene mark kr dya good but show nhi ho rha", then "automatic star bhi sath
  // me big ho gaya"). Direct lucide + Tailwind gives full control: the star only FILLS green when
  // status==="good" (user: "star pura fill ho jaye green color sy"). Default star colour matched to the
  // tick/cross's own muted default (2026-11-02 follow-up: "baki button k colors ki trhn rkho default pr
  // yellow kyun rkha hua ha" -- it briefly used --warn/yellow by default, inconsistent with the other two).
  const ICON = "h-5 w-5";
  const markButtons = leadId !== undefined && (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={mark.isPending}
        title={status ? "Called -- click to unmark" : "Tick: I called this number (counts it)"}
        onClick={() => toggle("tick", status ? null : "called")}
        className={`cursor-pointer disabled:cursor-default disabled:opacity-60 ${status ? "text-success" : "text-muted hover:text-success"}`}
      >
        {active === "tick" ? <Loader className={ICON} /> : status ? <CircleCheck className={ICON} /> : <Circle className={ICON} />}
      </button>
      <button
        type="button"
        disabled={mark.isPending}
        title={status === "good" ? "Marked good -- click to unmark" : "Mark this number good"}
        onClick={() => toggle("star", status === "good" ? null : "good")}
        className={`cursor-pointer disabled:cursor-default disabled:opacity-60 ${status === "good" ? "text-success" : "text-muted hover:text-warn"}`}
      >
        {active === "star" ? <Loader className={ICON} /> : <Star className={ICON} fill={status === "good" ? "currentColor" : "none"} />}
      </button>
      <button
        type="button"
        disabled={mark.isPending}
        title={status === "wrong" ? "Marked wrong -- click to unmark" : "Mark this number wrong/dead"}
        onClick={() => toggle("cross", status === "wrong" ? null : "wrong")}
        className={`cursor-pointer disabled:cursor-default disabled:opacity-60 ${status === "wrong" ? "text-danger" : "text-muted hover:text-danger"}`}
      >
        {active === "cross" ? <Loader className={ICON} /> : <CircleX className={ICON} />}
      </button>
    </span>
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can throw (no permission, insecure origin) -- the
      // number is still right there as selectable text either way.
    }
  }

  if (big) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={telUrl(number)}
          className="block flex-1 rounded-[8px] bg-success px-3 py-2.5 text-center font-mono text-[1.05rem] font-bold text-white no-underline shadow-[var(--shadow-call)]"
        >
          <Ico e="📞" /> Call {number}
        </a>
        <button
          type="button"
          onClick={copy}
          title="Copy number"
          className="shrink-0 cursor-pointer rounded-[8px] border border-border px-3 py-2.5 text-[0.9rem] text-muted hover:text-accent"
        >
          <Ico e={copied ? "✅" : "📋"} />
        </button>
        {markButtons}
      </div>
    );
  }

  return (
    // Plain sans at reading size and full-contrast text colour: the previous
    // 12px monospace in the accent colour on the beige theme was, per the team
    // lead (2026-09-19), "not understandable at all". tabular-nums keeps digits aligned.
    <div className="flex items-center gap-2">
      <a
        href={telUrl(number)}
        className="text-[1rem] font-semibold tabular-nums text-text underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
      >
        <Ico e="📞" /> {number}
      </a>
      {markButtons}
      <button
        type="button"
        onClick={copy}
        title="Copy number"
        className="cursor-pointer text-[0.95rem] text-muted hover:text-accent"
      >
        <Ico e={copied ? "✅" : "📋"} />
      </button>
    </div>
  );
}
