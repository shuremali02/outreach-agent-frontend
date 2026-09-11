import type { PhoneStatus } from "@/types";

/** The Cold Call Desk phone badge: verified / switchboard / needs direct line. */
export function PhoneBadge({ status, phone }: { status: PhoneStatus; phone: string }) {
  const spec =
    status === "verified_direct" && phone
      ? { text: "🟢 Verified Direct Line", bg: "var(--success-tint)", fg: "var(--success)" }
      : status === "switchboard"
        ? { text: "🟡 Switchboard", bg: "var(--warn-tint)", fg: "var(--warn)" }
        : { text: "⚪ Needs Direct Line", bg: "var(--danger-tint)", fg: "var(--danger)" };

  return (
    <span
      className="terminal-pill"
      style={{ background: spec.bg, color: spec.fg }}
    >
      {spec.text}
    </span>
  );
}
