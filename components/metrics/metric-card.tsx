import { Card } from "@/components/ui/card";
import { withIcons } from "@/components/ui/emoji-icon";

/**
 * .crm-card + .metric-label / .metric-val / .metric-sub — Today's 4-up grid, also used on Pipeline/
 * Contacts/Projects. `accent` (2026-10-14) just passes through to Card's own existing prop -- optional,
 * every pre-existing caller leaves it unset and renders exactly as before.
 */
export function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "success" | "warn" | "info" | "danger" | "accent";
}) {
  return (
    <Card className="!p-[1.25rem]" accent={accent}>
      <p className="metric-label">{withIcons(label)}</p>
      <p className="metric-val">{value}</p>
      {sub && <p className="metric-sub">{sub}</p>}
    </Card>
  );
}
