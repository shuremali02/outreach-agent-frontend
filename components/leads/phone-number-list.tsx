"use client";

import { useState } from "react";
import { telUrl } from "@/lib/format";

/**
 * Splits a comma-joined phone field (a contact/lead can now carry several --
 * see lead_engine.py's _all_phones()) into individually callable AND
 * copyable numbers. Confirmed live 2026-09-18: showing them all crammed into
 * one tel: link/text block dialed only the first one and gave no way to
 * reach or copy any of the others.
 */
export function PhoneNumberList({
  phones,
  size = "compact",
}: {
  phones: string;
  /** "button" = the big green Battlecard dialer; "compact" = a small inline
   * list, e.g. the Contacts/Decision Makers panel. */
  size?: "compact" | "button";
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
        <PhoneRow key={`${i}-${n}`} number={n} big={size === "button"} />
      ))}
    </div>
  );
}

function PhoneRow({ number, big }: { number: string; big: boolean }) {
  const [copied, setCopied] = useState(false);

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
          📞 Call {number}
        </a>
        <button
          type="button"
          onClick={copy}
          title="Copy number"
          className="shrink-0 cursor-pointer rounded-[8px] border border-border px-3 py-2.5 text-[0.9rem] text-muted hover:text-accent"
        >
          {copied ? "✅" : "📋"}
        </button>
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
        📞 {number}
      </a>
      <button
        type="button"
        onClick={copy}
        title="Copy number"
        className="cursor-pointer text-[0.95rem] text-muted hover:text-accent"
      >
        {copied ? "✅" : "📋"}
      </button>
    </div>
  );
}
