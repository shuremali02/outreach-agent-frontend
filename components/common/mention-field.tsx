"use client";

import { useMemo, useRef, useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { Input, Textarea } from "@/components/ui/input";
import { mentionHandle } from "@/lib/mentions";
import { MENTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Single-line <Input> by default; pass rows for a <Textarea>. */
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  "aria-label"?: string;
  className?: string;
}

interface Option {
  key: string;
  handle: string;
  label: string;
  hint: string;
}

/**
 * A text field where typing "@" offers the team (and "@team" for everyone).
 * The chosen name is inserted as plain text -- who actually gets notified is read back
 * from the text on submit (see lib/mentions.ts extractMentions).
 */
export function MentionField({ value, onChange, rows, ...rest }: Props) {
  const { data: users = [] } = useUsers();
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null); // text after the "@", null = closed
  const [active, setActive] = useState(0);

  const options: Option[] = useMemo(() => {
    const all: Option[] = [
      { key: "team", handle: "team", label: MENTIONS.teamLabel, hint: MENTIONS.teamHint },
      ...users.map((u) => ({
        key: String(u.id),
        handle: mentionHandle(u, users),
        label: u.name || u.email.split("@")[0],
        hint: u.email,
      })),
    ];
    const q = (query ?? "").toLowerCase();
    return all.filter((o) => o.handle.toLowerCase().startsWith(q) || o.label.toLowerCase().startsWith(q)).slice(0, 6);
  }, [users, query]);

  /** The "@part" being typed right before the cursor, if any. */
  function openFor(text: string, cursor: number) {
    const m = /(^|[\s(])@([\w.-]*)$/.exec(text.slice(0, cursor));
    setQuery(m ? m[2] : null);
    setActive(0);
  }

  function pick(o: Option) {
    const el = ref.current;
    const cursor = el?.selectionStart ?? value.length;
    const before = value.slice(0, cursor).replace(/@([\w.-]*)$/, `@${o.handle} `);
    const next = before + value.slice(cursor);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  }

  const shared = {
    ref,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      openFor(e.target.value, e.target.selectionStart ?? e.target.value.length);
    },
    onBlur: () => setTimeout(() => setQuery(null), 120), // let a click on the list land first
    onKeyDown: (e: React.KeyboardEvent) => {
      if (query === null || options.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(options[active]);
      } else if (e.key === "Escape") {
        setQuery(null);
      }
    },
    ...rest,
  };

  return (
    <div className="relative">
      {rows ? <Textarea rows={rows} {...shared} /> : <Input {...shared} />}
      {query !== null && options.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 z-50 mt-1 max-h-56 w-72 overflow-auto rounded-[8px] border border-border bg-card p-1 shadow-lg"
        >
          {options.map((o, i) => (
            <li key={o.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                className={cn(
                  "flex w-full cursor-pointer flex-col rounded-[6px] px-2 py-1.5 text-left",
                  i === active ? "bg-input" : "hover:bg-input",
                )}
              >
                <span className="text-[0.9rem] font-semibold">@{o.handle} <span className="font-normal text-muted">· {o.label}</span></span>
                <span className="text-[0.75rem] text-muted">{o.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
