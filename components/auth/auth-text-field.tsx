"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  icon: LucideIcon;
  /** Message from the validator; shown under the field and announced to screen readers. */
  error?: string;
  hint?: React.ReactNode;
  /** Sits inside the right edge (the show/hide button). */
  trailing?: React.ReactNode;
}

/** A labelled input with a leading icon and an inline error. Works with react-hook-form's register(). */
export const AuthTextField = React.forwardRef<HTMLInputElement, Props>(
  ({ label, icon: Icon, error, hint, trailing, id, ...props }, ref) => {
    const auto = React.useId();
    const inputId = id ?? auto;
    const messageId = `${inputId}-message`;
    return (
      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-[0.85rem] font-semibold text-text">
          {label}
        </label>
        <div className="relative">
          <Icon
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2",
              error ? "text-danger" : "text-muted",
            )}
          />
          <Input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            className={cn("h-11 pl-10 text-[0.95rem]", trailing && "pr-11", error && "border-danger focus:border-danger")}
            {...props}
          />
          {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
        </div>
        {(error || hint) && (
          <p
            id={messageId}
            role={error ? "alert" : undefined}
            className={cn("mt-1.5 text-[0.8rem]", error ? "text-danger" : "text-muted")}
          >
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);
AuthTextField.displayName = "AuthTextField";
