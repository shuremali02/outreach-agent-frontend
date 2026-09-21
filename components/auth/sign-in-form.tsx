"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { LOGIN } from "@/lib/constants";
import { signInSchema, type SignInValues } from "@/lib/validation/auth";
import { AuthTextField } from "./auth-text-field";
import { PasswordField } from "./password-field";

export function SignInForm({
  initialEmail = "",
  emailPlaceholder,
  busy,
  onSubmit,
  onSwitch,
}: {
  initialEmail?: string;
  emailPlaceholder: string;
  busy: boolean;
  onSubmit: (values: SignInValues) => void | Promise<void>;
  onSwitch: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: initialEmail, password: "" },
    mode: "onTouched",
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <AuthTextField
        label={LOGIN.emailLabel}
        icon={Mail}
        type="email"
        autoComplete="email"
        autoFocus
        placeholder={emailPlaceholder}
        error={errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        label={LOGIN.passwordLabel}
        autoComplete="current-password"
        maxLength={128}
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" variant="primary" size="lg" block className="h-11" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {busy ? LOGIN.submitting : LOGIN.signInButton}
      </Button>
      <button
        type="button"
        onClick={onSwitch}
        className="cursor-pointer text-center text-[0.85rem] font-semibold text-accent hover:underline"
      >
        {LOGIN.switchToCreate}
      </button>
    </form>
  );
}
