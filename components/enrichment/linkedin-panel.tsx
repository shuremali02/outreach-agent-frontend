"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { enrichmentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { linkedInXrayUrl, linkedInDirectSearchUrl } from "@/lib/format";
import type { Lead } from "@/types";
import { LINKEDIN_PANEL } from "@/lib/constants";

/** render_linkedin_research_and_reveal_ui — used on Today, Cold Call, Pipeline, Contacts. */
export function LinkedInResearchPanel({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const [note, setNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  const research = useMutation({
    mutationFn: () => enrichmentApi.researchLinkedIn(lead.id),
    onSuccess: (res) => {
      if (res.success) {
        setNote({ kind: "ok", text: `Found ${res.contact_name} — ${res.contact_role}` });
        qc.invalidateQueries({ queryKey: ["leads"] });
      } else {
        setNote({ kind: "warn", text: res.reason });
      }
    },
    onError: (e: Error) => setNote({ kind: "warn", text: e.message }),
  });

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        size="sm"
        block
        onClick={() => research.mutate()}
        disabled={research.isPending}
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
          🔗 Open LinkedIn (Apollo Reveal)
        </a>
      ) : (
        <>
          <a
            href={linkedInXrayUrl(lead.contact_name, lead.company_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-[7px] border border-linkedin bg-xray-bg px-3 py-2 text-center text-[0.85rem] font-semibold text-xray-text no-underline"
          >
            🌐 Google X-Ray Search (Apollo Reveal)
          </a>
          <a
            href={linkedInDirectSearchUrl(lead.contact_name, lead.company_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-[0.75rem] text-muted underline"
          >
            {LINKEDIN_PANEL.directSearch}
          </a>
        </>
      )}
    </div>
  );
}
