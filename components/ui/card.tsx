import { cn } from "@/lib/utils";

/**
 * .crm-card from app.py. `accent` reproduces the recurring
 * `border-left: 4px solid <semantic>` bar.
 */
export function Card({
  className,
  accent,
  hover = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  accent?: "success" | "warn" | "info" | "danger" | "accent";
  hover?: boolean;
}) {
  const accentColor = accent
    ? {
        success: "var(--success)",
        warn: "var(--warn)",
        info: "var(--info)",
        danger: "var(--danger)",
        accent: "var(--accent)",
      }[accent]
    : undefined;

  return (
    <div
      className={cn("crm-card", hover && "crm-card-hover", className)}
      style={accentColor ? { borderLeft: `4px solid ${accentColor}` } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
