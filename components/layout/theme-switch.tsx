"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * Replaces the sidebar's two big "🌾 Light Beige" / "🌙 Dark" buttons (user, 2026-09-23: "yeh light dark
 * theme k itny bary bary button hain sidebar me yeh bhi yahan sy remove kr k simpler toggle on off type
 * button laga do navbar me") -- a compact on/off switch in the top bar instead.
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-border bg-card transition-colors"
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white transition-transform",
          isDark ? "translate-x-[23px]" : "translate-x-[3px]",
        )}
      >
        {isDark ? <Moon className="h-3 w-3" aria-hidden /> : <Sun className="h-3 w-3" aria-hidden />}
      </span>
    </button>
  );
}
