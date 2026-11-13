"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceNotePlayer } from "@/components/leads/voice-note-player";

/**
 * Readable timeline for a lead's notes (user, 2026-11-11: the raw "[Oct 02, 17:24 Ali] text" blob "vague sa
 * arha hai, points me dikhao"). `lead.notes` stays one append-only text column (see crud/leads.py
 * add_note / apply_call_outcome) -- this only PARSES it for display, nothing about storage changes.
 *
 * Entry header: `[Mon DD, HH:MM Author]` or `[Mon DD, HH:MM Author · Label]`. Lines that don't start a new
 * header (e.g. a meeting link on its own line) belong to the entry above. Text before the first header
 * (old free-form notes) shows as an undated entry. Oldest first, latest at the bottom.
 */
const HEADER = /^\[([A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2})\s+([^\]]*)\]\s?(.*)$/;
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

interface NoteEntry {
  when: string | null;
  author: string | null;
  label: string | null;
  body: string;
}

export function parseNotes(raw: string): NoteEntry[] {
  const entries: NoteEntry[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const m = HEADER.exec(line);
    if (m) {
      const [author, ...rest] = m[2].split(" · ");
      entries.push({
        when: m[1],
        author: author.trim() || null,
        label: rest.join(" · ").trim() || null,
        body: m[3].trim(),
      });
    } else if (entries.length === 0) {
      if (line.trim()) entries.push({ when: null, author: null, label: null, body: line.trim() });
    } else if (line.trim()) {
      const last = entries[entries.length - 1];
      last.body = last.body ? `${last.body}\n${line.trim()}` : line.trim();
    }
  }
  return entries; // stored oldest-first; latest stays at the bottom (user, 2026-11-11)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older / non-HTTPS contexts: fall back to a hidden textarea.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** A URL in a note: shown in full-looking form, click COPIES it (never opens a tab -- user, 2026-11-11). */
function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  // Trailing sentence punctuation is not part of the link.
  const clean = url.replace(/[.,;:!?)]+$/, "");
  const tail = url.slice(clean.length);
  return (
    <>
      <button
        type="button"
        title="Click to copy"
        onClick={async () => {
          if (await copyText(clean)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
        className="my-0.5 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-[6px] border border-border bg-card px-2 py-0.5 text-left text-[0.82rem] text-accent hover:border-accent"
      >
        <span className="min-w-0 break-all underline underline-offset-2">{clean.replace(/^https?:\/\//, "")}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-label="Copied" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
        )}
      </button>
      {tail}
    </>
  );
}

/** "Nov 11, 21:49" -> "Nov 11, 9:49 PM". The stored stamp stays 24h; only the display is 12h. */
function to12h(stamp: string): string {
  const m = /^(.*,\s*)(\d{1,2}):(\d{2})$/.exec(stamp);
  if (!m) return stamp;
  const h = Number(m[2]);
  return `${m[1]}${h % 12 === 0 ? 12 : h % 12}:${m[3]} ${h >= 12 ? "PM" : "AM"}`;
}

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        /^https?:\/\//.test(part) ? <CopyLink key={i} url={part} /> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

// A voice note's marker line (written by the backend, crud/voice_notes.py): "🎙 Voice note (0:42) [vn:12]".
const VOICE_RE = /\u{1F399}?\s*Voice note \((\d+):(\d{2})\)\s*\[vn:(\d+)\]/u;

function NoteBody({ body }: { body: string }) {
  if (!body) return null;
  const m = VOICE_RE.exec(body);
  if (m) {
    const rest = body.replace(VOICE_RE, "").trim();
    return (
      <>
        <VoiceNotePlayer id={Number(m[3])} durationSec={Number(m[1]) * 60 + Number(m[2])} />
        {rest && (
          <p className="mt-0.5 whitespace-pre-line break-words text-[0.88rem] leading-snug">
            <Linkified text={rest} />
          </p>
        )}
      </>
    );
  }
  return (
    <p className="mt-0.5 whitespace-pre-line break-words text-[0.88rem] leading-snug">
      <Linkified text={body} />
    </p>
  );
}

export function NotesLog({ notes, className }: { notes: string; className?: string }) {
  const entries = parseNotes(notes);
  if (entries.length === 0) return null;
  return (
    <ol className={cn("rounded-[8px] bg-input px-3 py-3", className)}>
      {entries.map((e, i) => (
        <li key={i} className="relative pb-3.5 pl-5 last:pb-0">
          {/* timeline rail + dot */}
          {i < entries.length - 1 && <span className="absolute bottom-0 left-[4px] top-3 w-px bg-border" aria-hidden />}
          <span className="absolute left-0 top-[0.42rem] h-[9px] w-[9px] rounded-full bg-accent" aria-hidden />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.75rem] text-muted">
            {e.when && <span className="tabular-nums">{to12h(e.when)}</span>}
            {e.author && <span className="font-semibold text-text">{e.author}</span>}
            {e.label && (
              <span className="rounded-[6px] border border-border bg-tag px-1.5 py-px text-[0.7rem] font-semibold text-text">
                {e.label}
              </span>
            )}
          </div>
          <NoteBody body={e.body} />
        </li>
      ))}
    </ol>
  );
}
