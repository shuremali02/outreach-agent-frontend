import { SectionHeader } from "@/components/common/section-header";
import { ContactsView } from "@/components/contacts/contacts-view";
import { leadsApi } from "@/lib/api";
import { PAGE_HEADERS } from "@/lib/constants";

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const leads = await leadsApi.list({ q });

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
