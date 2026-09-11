import { hasUsableEmail, mailtoUrl } from "@/lib/format";

/**
 * app.py guarded every mailto with:
 *   email and email != "unknown" and "@" in email
 * Renders nothing when that guard fails, exactly as Streamlit did.
 */
export function MailtoButton({
  email,
  subject,
  body,
  label = "📧 Open in Email Client",
  block = false,
}: {
  email: string;
  subject: string;
  body: string;
  label?: string;
  block?: boolean;
}) {
  if (!hasUsableEmail(email)) return null;

  return (
    <a
      href={mailtoUrl(email, subject, body)}
      className={`${block ? "block text-center" : "inline-block"} rounded-[6px] bg-accent px-3.5 py-1.5 text-[0.85rem] font-semibold text-white no-underline transition-colors hover:bg-accent-hover`}
    >
      {label}
    </a>
  );
}
