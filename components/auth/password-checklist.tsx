"use client";

import { Check, Circle } from "lucide-react";
import { LOGIN } from "@/lib/constants";
import { passwordRules, passwordScore } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

const BAR_COLORS = ["var(--danger)", "var(--danger)", "var(--warn)", "var(--info)", "var(--success)"];

/** Live strength bar + the four requirements ticking off as the person types. */
export function PasswordChecklist({ password, min }: { password: string; min: number }) {
  const score = passwordScore(password, min);
  const rules = passwordRules(min);
  const color = BAR_COLORS[score];
  return (
    <div className="rounded-[8px] bg-input px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: password && i <= score ? color : "var(--border)" }}
            />
          ))}
        </div>
        <span className="w-16 text-right text-[0.75rem] font-semibold" style={{ color: password ? color : "var(--muted)" }}>
          {password ? LOGIN.strength[score] : ""}
        </span>
      </div>
      <ul aria-label={LOGIN.passwordRulesLabel} className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {rules.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={cn("flex items-center gap-1.5 text-[0.8rem]", ok ? "text-success" : "text-muted")}>
              {ok ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              <span>{r.label}</span>
              <span className="sr-only">{ok ? " (met)" : " (not met yet)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
