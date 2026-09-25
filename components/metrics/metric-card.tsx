import { Card } from "@/components/ui/card";
import { withIcons } from "@/components/ui/emoji-icon";

/** .crm-card + .metric-label / .metric-val / .metric-sub — Today's 4-up grid. */
export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="!p-[1.25rem]">
      <p className="metric-label">{withIcons(label)}</p>
      <p className="metric-val">{value}</p>
      {sub && <p className="metric-sub">{sub}</p>}
    </Card>
  );
}
