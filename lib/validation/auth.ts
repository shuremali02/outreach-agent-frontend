/**
 * Sign-in / create-account rules, as zod schemas. The form types are inferred from them, so the
 * fields, the checks and the TypeScript types cannot drift apart. The server enforces the same
 * rules (outreach-backend/app/schemas/auth.py + services/auth.py password_problem); this copy just
 * tells the person immediately instead of after a round trip.
 */
import { z } from "zod";

export const DEFAULT_MIN_PASSWORD = 8;
export const PASSWORD_MAX = 128;

export interface PasswordRule {
  id: "length" | "upper" | "lower" | "digit";
  /** Shown in the live checklist. */
  label: string;
  /** Used to build the sentence "Password needs ...". */
  need: string;
  test: (password: string) => boolean;
}

/** ASCII on purpose: identical to the server's check. */
export function passwordRules(min = DEFAULT_MIN_PASSWORD): PasswordRule[] {
  return [
    { id: "length", label: `${min} or more characters`, need: `at least ${min} characters`, test: (p) => p.length >= min },
    { id: "upper", label: "One uppercase letter (A-Z)", need: "an uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { id: "lower", label: "One lowercase letter (a-z)", need: "a lowercase letter", test: (p) => /[a-z]/.test(p) },
    { id: "digit", label: "One number (0-9)", need: "a number", test: (p) => /[0-9]/.test(p) },
  ];
}

/** 0 (nothing met) to 4 (all met). */
export function passwordScore(password: string, min = DEFAULT_MIN_PASSWORD): number {
  return passwordRules(min).filter((r) => r.test(password)).length;
}

/** "Password needs at least 8 characters, an uppercase letter and a number." -- same wording as the server. */
export function passwordProblem(password: string, min = DEFAULT_MIN_PASSWORD): string | null {
  const missing = passwordRules(min)
    .filter((r) => !r.test(password))
    .map((r) => r.need);
  if (missing.length === 0) return null;
  const joined = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
  return `Password needs ${joined}.`;
}

const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const EMAIL_MESSAGE = "Enter a valid email address.";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(320, EMAIL_MESSAGE)
  .refine((v) => v === "" || (EMAIL_RE.test(v) && !v.includes("..")), EMAIL_MESSAGE);

const nameField = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2, "Enter your name (at least 2 characters).")
      .max(120, "That name is too long.")
      .refine((v) => /\p{L}/u.test(v) && /^[\p{L}\p{N} .,'’-]+$/u.test(v), "Use only letters, spaces and . , ' - in your name."),
  );

export const signInSchema = z.object({
  email: emailField,
  // No strength rules on sign-in: only the create-account form enforces them.
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX, "That password is too long."),
});
export type SignInValues = z.infer<typeof signInSchema>;

export function signUpSchema(opts: { minLength?: number; codeRequired?: boolean } = {}) {
  const min = opts.minLength ?? DEFAULT_MIN_PASSWORD;
  return z
    .object({
      name: nameField,
      email: emailField,
      password: z
        .string()
        .max(PASSWORD_MAX, "That password is too long.")
        .superRefine((value, ctx) => {
          const problem = passwordProblem(value, min);
          if (problem) ctx.addIssue({ code: "custom", message: problem });
        }),
      confirm: z.string().min(1, "Type the password again."),
      code: z.string().trim().max(200),
    })
    .superRefine((v, ctx) => {
      if (v.confirm && v.password !== v.confirm) {
        ctx.addIssue({ code: "custom", path: ["confirm"], message: "The two passwords do not match." });
      }
      if (opts.codeRequired && !v.code) {
        ctx.addIssue({ code: "custom", path: ["code"], message: "Enter the invite code." });
      }
    });
}
export type SignUpValues = z.infer<ReturnType<typeof signUpSchema>>;
