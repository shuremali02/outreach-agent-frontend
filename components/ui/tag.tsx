import { cn } from "@/lib/utils";

/** .stage-tag */
export function StageTag({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("stage-tag", className)}>{children}</span>;
}

/** .terminal-pill-{green|amber|blue} */
export function TerminalPill({
  variant = "green",
  className,
  children,
}: {
  variant?: "green" | "amber" | "blue";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("terminal-pill", `terminal-pill-${variant}`, className)}>{children}</span>
  );
}
