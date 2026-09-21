"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, KeyRound, Loader2, Mail, User } from "lucide-react";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { LOGIN } from "@/lib/constants";
import { signUpSchema, type SignUpValues } from "@/lib/validation/auth";
import { AuthTextField } from "./auth-text-field";
import { PasswordChecklist } from "./password-checklist";
import { PasswordField } from "./password-field";

export function SignUpForm({
  minLength,
  codeRequired,
  emailPlaceholder,
  busy,
  onSubmit,
  onSwitch,
}: {
  minLength: number;
  codeRequired: boolean;
  emailPlaceholder: string;
  busy: boolean;
  onSubmit: (values: SignUpValues) => void | Promise<void>;
  onSwitch: () => void;
}) {
  const schema = useMemo(() => signUpSchema({ minLength, codeRequired }), [minLength, codeRequired]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<SignUpValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "", code: "" },
    mode: "onTouched",
  });

  const password = useWatch({ control, name: "password" });
  const confirm = useWatch({ control, name: "confirm" });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <AuthTextField
        label={LOGIN.nameLabel}
        icon={User}
        autoComplete="name"
        autoFocus
        maxLength={120}
        placeholder={LOGIN.namePlaceholder}
        error={errors.name?.message}
        {...register("name")}
      />
      <AuthTextField
        label={LOGIN.emailLabel}
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder={emailPlaceholder}
        error={errors.email?.message}
        {...register("email")}
      />
      <div className="flex flex-col gap-2">
        <PasswordField
          label={LOGIN.passwordLabel}
          autoComplete="new-password"
          maxLength={128}
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordChecklist password={password ?? ""} min={minLength} />
      </div>
      <div>
        <PasswordField
          label={LOGIN.confirmLabel}
          autoComplete="new-password"
          maxLength={128}
          error={errors.confirm?.message}
          {...register("confirm")}
        />
        {confirm && confirm === password && !errors.confirm && (
          <p className="mt-1.5 flex items-center gap-1 text-[0.8rem] text-success">
            <Check className="h-3.5 w-3.5" aria-hidden /> {LOGIN.passwordsMatch}
          </p>
        )}
      </div>
      {codeRequired && (
        <AuthTextField
          label={LOGIN.codeLabel}
          icon={KeyRound}
          autoComplete="off"
          maxLength={200}
          hint={LOGIN.codeHint}
          error={errors.code?.message}
          {...register("code")}
        />
      )}
      <Button type="submit" variant="primary" size="lg" block className="h-11" disabled={busy || !isValid}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {busy ? LOGIN.submitting : LOGIN.createButton}
      </Button>
      <button
        type="button"
        onClick={onSwitch}
        className="cursor-pointer text-center text-[0.85rem] font-semibold text-accent hover:underline"
      >
        {LOGIN.switchToSignIn}
      </button>
    </form>
  );
}
