"use client";

import { useSyncExternalStore } from "react";
import { SALESFORCE_QUOTES, QUOTE_SLOT_SECONDS } from "@/lib/constants";

function currentSlot() {
  return Math.floor(Date.now() / 1000 / QUOTE_SLOT_SECONDS) % SALESFORCE_QUOTES.length;
}

/** Re-checks once a minute; the slot only changes every 15. */
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/**
 * Rotates on the same 15-minute slot as app.py.
 *
 * Streamlit injected a <script> that reloaded the entire page to advance this.
 * Here it is a subscription that swaps the text — deliberately NOT a reload.
 */
export function QuoteStrip() {
  const idx = useSyncExternalStore(subscribe, currentSlot, () => 0);
  const [text, author] = SALESFORCE_QUOTES[idx];

  return (
    <div className="mb-[1.15rem] flex flex-wrap items-center gap-2">
      <span className="text-[0.95rem] font-medium italic text-text">“{text}”</span>
      <span className="text-[0.95rem] font-bold text-accent">— {author}</span>
    </div>
  );
}
