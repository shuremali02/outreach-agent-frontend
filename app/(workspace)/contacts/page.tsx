import { SectionHeader } from "@/components/common/section-header";
import { ContactsView } from "@/components/contacts/contacts-view";
import { leadsApi } from "@/lib/api";
import { PAGE_HEADERS } from "@/lib/constants";

// See cold-call/page.tsx.
export const dynamic = "force-dynamic";

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  // searchAllStages (2026-10-29): a real search here should also find a Not Interested/Dead Line lead --
  // see types/lead.ts LeadFilters.searchAllStages. No-op when q is empty.
  const leads = await leadsApi.list({ q, limit: 100, searchAllStages: true });

  return (
    <div>
      <SectionHeader
        eyebrow={PAGE_HEADERS.contacts.eyebrow}
        title={PAGE_HEADERS.contacts.title}
        subtitle={PAGE_HEADERS.contacts.subtitle}
      />
      <ContactsView initialLeads={leads} q={q} />
    </div>
  );
}
