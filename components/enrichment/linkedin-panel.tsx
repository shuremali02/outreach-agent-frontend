"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { enrichmentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { linkedInXrayUrl, linkedInDirectSearchUrl } from "@/lib/format";
import type { Lead } from "@/types";
import { LINKEDIN_PANEL, TOASTS } from "@/lib/constants";
import { Ico, withIcons } from "@/components/ui/emoji-icon";

/** render_linkedin_research_and_reveal_ui — used on Today, Cold Call, Pipeline, Contacts. */
export function LinkedInResearchPanel({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  const research = useMutation({
    mutationFn: () => enrichmentApi.researchLinkedIn(lead.id),
    onSuccess: (res) => {
      if (res.success) {
        setNote({ kind: "ok", text: `Found ${res.contact_name} — ${res.contact_role}` });
        toast.success(TOASTS.linkedInResearched(res.contact_name));
        qc.invalidateQueries({ queryKey: ["leads"] });
        // The backend also saves the found person as a contact (so Find phone
        // can run on it) -- refresh that list too.
        qc.invalidateQueries({ queryKey: ["lead-contacts", lead.id] });
      } else {
        setNote({ kind: "warn", text: res.reason });
        toast.info(TOASTS.linkedInResearchNone);
      }
    },
    onError: (e: Error) => {
      setNote({ kind: "warn", text: e.message });
      toast.error(e.message);
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        block
        onClick={() => research.mutate()}
        loading={research.isPending}
      >
        {research.isPending ? "Researching…" : "🤖 AI Research LinkedIn (Gemini Flash)"}
      </Button>

      {note && (
        <p className={`text-[0.8rem] ${note.kind === "ok" ? "text-success" : "text-warn"}`}>
          {note.text}
        </p>
      )}

      {lead.contact_linkedin ? (
        <a
          href={lead.contact_linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-[7px] bg-linkedin px-3 py-2 text-center text-[0.85rem] font-semibold text-white no-underline shadow-[var(--shadow-linkedin)]"
        >
          {/* Was "🔗 Open LinkedIn (Apollo Reveal)" in app.py -- this link
              never calls Apollo, it just opens the saved URL, so the
              "(Apollo Reveal)" suffix was misleading and is dropped here. */}
          <Ico e="🔗" /> Open LinkedIn
        </a>
      ) : (
        <>
          <a
            href={linkedInXrayUrl(lead.contact_name, lead.company_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-[7px] border border-linkedin bg-xray-bg px-3 py-2 text-center text-[0.85rem] font-semibold text-xray-text no-underline"
          >
            {/* Was "🌐 Google X-Ray Search (Apollo Reveal)" in app.py -- this
                is a manual Google search link, not an Apollo API call. */}
            <Ico e="🌐" /> Google X-Ray Search
          </a>
          <a
            href={linkedInDirectSearchUrl(lead.contact_name, lead.company_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-[0.75rem] text-muted underline"
          >
            {withIcons(LINKEDIN_PANEL.directSearch)}
          </a>
        </>
      )}
    </div>
  );
}
