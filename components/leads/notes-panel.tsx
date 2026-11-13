"use client";

import { useState } from "react";
import { useAddNote, useEditNotes } from "@/hooks/use-leads";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/api";
import { useUsers } from "@/hooks/use-users";
import { extractMentions } from "@/lib/mentions";
import type { Lead } from "@/types";
import { NotesLog } from "@/components/leads/notes-log";
import { NoteComposer } from "@/components/leads/note-composer";
import { Ico } from "@/components/ui/emoji-icon";

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
  // Nothing here needs the long text columns any more (only the "Open in Email App" body did, and that button is
  // commented out below), so the slim row is enough. It used to fetch the FULL lead for every open card, which on a
  // page of 100 open cards fired 100 requests at once (2026-11-13: QueuePool exhausted on the live backend).
  const lead = listLead;
  const addNote = useAddNote();
  const editNotes = useEditNotes();
  const toast = useToast();
  // The notes text the editor was opened on -- sent back as `expected` so a note added meanwhile is never overwritten.
  const [editing, setEditing] = useState<{ from: string; text: string } | null>(null);
  const [draft, setDraft] = useState("");
  const { data: users = [] } = useUsers();

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[1rem] font-semibold"><Ico e="📝" /> Notes &amp; Actions</h4>
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
              <Ico e="💾" /> Save Notes
            </Button>
            <Button variant="secondary" size="sm" disabled={editNotes.isPending} onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        lead.notes && (
          <div className="flex flex-col gap-1">
            <NotesLog notes={lead.notes} />
            <button
              type="button"
              onClick={() => setEditing({ from: lead.notes, text: lead.notes })}
              className="cursor-pointer self-start text-[0.8rem] font-semibold text-accent hover:underline"
            >
              <Ico e="✏" /> Edit notes
            </button>
          </div>
        )
      )}
      <NoteComposer
        leadId={lead.id}
        value={draft}
        onChange={setDraft}
        adding={addNote.isPending}
        onAdd={() =>
          addNote.mutate(
            { id: lead.id, text: draft, mention: extractMentions(draft, users) },
            { onSuccess: () => setDraft("") },
          )
        }
      />
      {/* "Open in Email App" temporarily commented out, not removed (user, 2026-10-21: "abhi k lye
          commentout krdo jab need ho gi tb dekh lyngy") -- a proper email feature is being built to
          replace this mailto: shortcut. Shared component (Pipeline/Contacts/Meetings popup all render
          this same NotesPanel), so this takes it out of all three at once. The `MailtoButton` import
          above was removed (2026-10-28) since it was unused while this stays commented out -- re-add
          `import { MailtoButton } from "@/components/common/mailto-button";` when uncommenting this.
      <MailtoButton
        email={lead.contact_email}
        subject={lead.subject}
        body={lead.body}
        label="📧 Open in Email App"
        block
      /> */}
    </div>
  );
}
