"use client";

import { useState } from "react";
import { useAddNote, useEditNotes, useFullLead } from "@/hooks/use-leads";
import { MailtoButton } from "@/components/common/mailto-button";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { MentionField } from "@/components/common/mention-field";
import { useUsers } from "@/hooks/use-users";
import { extractMentions } from "@/lib/mentions";
import { MENTIONS } from "@/lib/constants";
import type { Lead } from "@/types";

/**
 * Shared with components/contacts/contacts-view.tsx (extracted so the
 * Meetings popup — see meeting-detail-dialog.tsx — shows the exact same
 * notes log and Add Note flow instead of a second, drifting copy).
 *
 * (Editing was added back 2026-09-25 -- see the "Edit" button below: it saves against the text it started
 * from and the backend refuses with 409 if a note landed meanwhile, so it cannot silently erase one.)
 *
 * Read-only log, not an editable textarea -- the old "Save Notes" button
 * PATCHed this whole field back verbatim, which silently erased a
 * call-disposition note appended elsewhere (Cold Call Desk) while this card
 * sat open with stale local state (confirmed live 2026-09-18). Notes are
 * now append-only everywhere, matching how call-disposition notes already
 * worked -- see crud/leads.py add_note() / apply_call_outcome().
 */
export function NotesPanel({ lead: listLead }: { lead: Lead }) {
  // Only the "Open in Email App" body needs the full lead; mounts with the open card, so it is fetched on demand.
  const { lead } = useFullLead(listLead);
  const addNote = useAddNote();
  const editNotes = useEditNotes();
  const toast = useToast();
  // The notes text the editor was opened on -- sent back as `expected` so a note added meanwhile is never overwritten.
  const [editing, setEditing] = useState<{ from: string; text: string } | null>(null);
  const [draft, setDraft] = useState("");
  const { data: users = [] } = useUsers();

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold">📝 Notes &amp; Actions</h4>
      {editing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            rows={8}
            value={editing.text}
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            aria-label="Edit notes"
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={editNotes.isPending}
              onClick={() =>
                editNotes.mutate(
                  { id: lead.id, text: editing.text, expected: editing.from },
                  {
                    onSuccess: () => {
                      toast.success("Notes updated");
                      setEditing(null);
                    },
                    onError: (e) =>
                      toast.error(
                        e instanceof ApiRequestError && e.status === 409
                          ? "Someone added a note while you were editing -- nothing was saved. Close and edit again."
                          : e instanceof Error
                            ? e.message
                            : "Could not save the notes.",
                      ),
                  },
                )
              }
            >
              💾 Save Notes
            </Button>
            <Button variant="secondary" size="sm" disabled={editNotes.isPending} onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        lead.notes && (
          <div className="flex flex-col gap-1">
            <p className="whitespace-pre-line rounded-[8px] bg-input px-3 py-2 text-[0.85rem]">{lead.notes}</p>
            <button
              type="button"
              onClick={() => setEditing({ from: lead.notes, text: lead.notes })}
              className="cursor-pointer self-start text-[0.8rem] font-semibold text-accent hover:underline"
            >
              ✏️ Edit notes
            </button>
          </div>
        )
      )}
      <Field label="Add a Note">
        <MentionField rows={3} value={draft} onChange={setDraft} />
        <p className="mt-1 text-[0.75rem] text-muted">{MENTIONS.hint}</p>
      </Field>
      <Button
        variant="primary"
        size="sm"
        loading={addNote.isPending}
        disabled={!draft.trim()}
        onClick={() =>
          addNote.mutate(
            { id: lead.id, text: draft, mention: extractMentions(draft, users) },
            { onSuccess: () => setDraft("") },
          )
        }
      >
        {addNote.isPending ? "Adding…" : "➕ Add Note"}
      </Button>
      <MailtoButton
        email={lead.contact_email}
        subject={lead.subject}
        body={lead.body}
        label="📧 Open in Email App"
        block
      />
    </div>
  );
}
