"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import * as React from "react";
import { LOGIN } from "@/lib/constants";
import { AuthTextField } from "./auth-text-field";

type Props = Omit<React.ComponentProps<typeof AuthTextField>, "icon" | "trailing" | "type">;

/** Password input with a show/hide button, so people can check what they typed. */
export const PasswordField = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const [visible, setVisible] = React.useState(false);
  const label = visible ? LOGIN.hidePassword : LOGIN.showPassword;
  return (
    <AuthTextField
      ref={ref}
      icon={Lock}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={label}
          aria-pressed={visible}
          title={label}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-muted hover:bg-card hover:text-accent"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
        </button>
      }
      {...props}
    />
  );
});
PasswordField.displayName = "PasswordField";
