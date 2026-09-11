import { Card } from "@/components/ui/card";
import { TerminalPill } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

/**
 * .crm-card + .terminal-ticker + a coloured pill.
 * Sales Terminal's 5-up and Cold Call Desk's 4-up grids.
 */
export function TickerCard({
  label,
  value,
  pill,
  pillVariant = "green",
  sub,
  accentBorder = false,
  valueColor,
  size = "lg",
}: {
  label: string;
  value: string;
  pill?: string;
  pillVariant?: "green" | "amber" | "blue";
  sub?: string;
  accentBorder?: boolean;
  valueColor?: "accent" | "success" | "info" | "text";
  size?: "lg" | "md";
}) {
  const colorClass = {
    accent: "text-accent",
    success: "text-success",
    info: "text-info",
    text: "text-text",
  }[valueColor ?? "text"];

  return (
    <Card
      className={cn("!p-[1.15rem]", accentBorder && "!border-[1.5px] !border-accent")}
    >
      <p className="metric-label">{label}</p>
      <p className={cn("terminal-ticker", colorClass, size === "md" && "!text-[1.8rem]")}>{value}</p>
      {pill && (
        <div className="mt-1.5">
          <TerminalPill variant={pillVariant}>{pill}</TerminalPill>
        </div>
      )}
      {sub && <p className="metric-sub mt-1.5">{sub}</p>}
    </Card>
  );
}
