"use client";

import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const base =
    "flex-1 rounded-[8px] border px-2 py-1.5 text-[0.82rem] font-semibold transition-colors";

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        className={cn(
          base,
          theme === "light"
            ? "border-transparent bg-accent text-white"
            : "border-border bg-card text-muted hover:border-accent hover:text-accent",
        )}
      >
        🌾 Light Beige
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        className={cn(
          base,
          theme === "dark"
            ? "border-transparent bg-accent text-white"
            : "border-border bg-card text-muted hover:border-accent hover:text-accent",
        )}
      >
        🌙 Dark
      </button>
    </div>
  );
}
