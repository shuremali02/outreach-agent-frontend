"use client";

import { useState } from "react";
import { useAddNote } from "@/hooks/use-leads";
import { MailtoButton } from "@/components/common/mailto-button";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
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
 * Read-only log, not an editable textarea -- the old "Save Notes" button
 * PATCHed this whole field back verbatim, which silently erased a
 * call-disposition note appended elsewhere (Cold Call Desk) while this card
 * sat open with stale local state (confirmed live 2026-09-18). Notes are
 * now append-only everywhere, matching how call-disposition notes already
 * worked -- see crud/leads.py add_note() / apply_call_outcome().
 */
export function NotesPanel({ lead }: { lead: Lead }) {
  const addNote = useAddNote();
  const [draft, setDraft] = useState("");
  const { data: users = [] } = useUsers();

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold">📝 Notes &amp; Actions</h4>
      {lead.notes && (
        <p className="whitespace-pre-line rounded-[8px] bg-input px-3 py-2 text-[0.85rem]">
          {lead.notes}
        </p>
      )}
      <Field label="Add a Note">
        <MentionField rows={3} value={draft} onChange={setDraft} />
        <p className="mt-1 text-[0.75rem] text-muted">{MENTIONS.hint}</p>
      </Field>
      <Button
        variant="primary"
        size="sm"
        disabled={addNote.isPending || !draft.trim()}
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
