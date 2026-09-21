"use client";

import { AlertCircle, AtSign, BarChart3, Phone } from "lucide-react";
import Script from "next/script";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ApiRequestError, authApi } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";
import { LOGIN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SignInValues, SignUpValues } from "@/lib/validation/auth";
import type { LoginResult } from "@/types";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

interface GoogleId {
  initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/** Where to go after signing in: the page the proxy bounced us from, else Today. Same-site paths only. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/today";
}

type Mode = "signin" | "create";
interface FormError {
  message: string;
  status?: number;
}

const PANEL_ICONS = [Phone, BarChart3, AtSign];

export function LoginView() {
  const { data: config, isError } = useQuery({ queryKey: ["auth-config"], queryFn: authApi.config, retry: 1 });
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<FormError | null>(null);
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");
  const [devEmail, setDevEmail] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);

  function finish(result: LoginResult) {
    saveSession(result.token, result.user);
    window.location.href = nextPath();
  }

  /** Runs one sign-in call with the shared busy / error handling. */
  async function run(call: () => Promise<LoginResult>) {
    setBusy(true);
    setError(null);
    try {
      finish(await call());
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : LOGIN.failed,
        status: e instanceof ApiRequestError ? e.status : undefined,
      });
      setBusy(false);
    }
  }

  const signIn = (v: SignInValues) => run(() => authApi.login(v.email, v.password));
  const signUp = (v: SignUpValues) =>
    run(() =>
      authApi.signup({
        name: v.name,
        email: v.email,
        password: v.password,
        code: config?.signup_code_required ? v.code : undefined,
      }),
    );

  function switchTo(next: Mode, email = "") {
    setMode(next);
    setPrefillEmail(email);
    setError(null);
  }

  // Draw Google's own button once both the script and the client id are here.
  useEffect(() => {
    const clientId = config?.google_client_id;
    if (!scriptReady || !clientId || !window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (r) => void run(() => authApi.google(r.credential)),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      width: Math.min(400, Math.max(200, buttonRef.current.offsetWidth || 340)),
    });
    // run() only uses stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, config?.google_client_id]);

  const domain = config?.allowed_domains?.[0];
  const emailPlaceholder = domain ? `name@${domain}` : "name@company.com";
  const creating = mode === "create";

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Brand panel: wide screens only. */}
      <aside className="hidden flex-col justify-between border-r border-border bg-sidebar p-12 lg:flex">
        <Logo />
        <div className="max-w-[440px]">
          <h2 className="text-[2rem] font-bold leading-tight tracking-tight">{LOGIN.panelHeading}</h2>
          <ul className="mt-8 flex flex-col gap-5">
            {LOGIN.panelPoints.map((text, i) => {
              const Icon = PANEL_ICONS[i];
              return (
                <li key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-card text-accent shadow-sm">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="text-[1rem] leading-snug text-muted">{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <span aria-hidden />
      </aside>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>

          <div className="rounded-[12px] border border-border bg-card p-6 shadow-[var(--shadow-overlay)] sm:p-8">
            <div role="tablist" aria-label={LOGIN.title} className="mb-6 grid grid-cols-2 gap-1 rounded-[10px] bg-input p-1">
              {(["signin", "create"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchTo(m)}
                  className={cn(
                    "cursor-pointer rounded-[8px] px-3 py-2 text-[0.9rem] font-semibold transition-colors",
                    mode === m ? "bg-card text-text shadow-sm" : "text-muted hover:text-text",
                  )}
                >
                  {m === "signin" ? LOGIN.tabSignIn : LOGIN.tabCreate}
                </button>
              ))}
            </div>

            <h1 className="text-[1.5rem] font-bold tracking-tight">{creating ? LOGIN.createTitle : LOGIN.welcomeBack}</h1>
            <p className="mb-5 mt-1 text-[0.95rem] text-muted">{creating ? LOGIN.createSubtitle : LOGIN.subtitle}</p>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-[8px] px-3 py-2.5 text-[0.9rem]"
                style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p>{error.message}</p>
                  {error.status === 409 && (
                    <button
                      type="button"
                      onClick={() => switchTo("signin")}
                      className="mt-1 cursor-pointer font-semibold underline"
                    >
                      {LOGIN.signInInstead}
                    </button>
                  )}
                </div>
              </div>
            )}

            {config ? (
              creating ? (
                <SignUpForm
                  minLength={config.min_password_length}
                  codeRequired={config.signup_code_required}
                  emailPlaceholder={emailPlaceholder}
                  busy={busy}
                  onSubmit={signUp}
                  onSwitch={() => switchTo("signin")}
                />
              ) : (
                <SignInForm
                  key={prefillEmail}
                  initialEmail={prefillEmail}
                  emailPlaceholder={emailPlaceholder}
                  busy={busy}
                  onSubmit={signIn}
                  onSwitch={() => switchTo("create")}
                />
              )
            ) : isError ? (
              <p className="text-[0.9rem] text-danger">{LOGIN.backendDown}</p>
            ) : (
              <p className="text-[0.9rem] text-muted">{LOGIN.loading}</p>
            )}

            {config?.google_client_id && (
              <>
                <div className="my-5 flex items-center gap-3 text-[0.8rem] text-muted">
                  <span className="h-px flex-1 bg-border" />
                  {LOGIN.or}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Script
                  src="https://accounts.google.com/gsi/client"
                  strategy="afterInteractive"
                  onReady={() => setScriptReady(true)}
                />
                <div ref={buttonRef} className="flex min-h-[44px] justify-center" />
              </>
            )}

            {config?.dev_login && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => authApi.devLogin(devEmail));
                }}
                className="mt-6 flex flex-col gap-2 rounded-[8px] border border-dashed border-border p-3"
              >
                <p className="text-[0.8rem] font-semibold text-muted">{LOGIN.devHeading}</p>
                <Input
                  type="email"
                  required
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder={emailPlaceholder}
                  aria-label={LOGIN.emailLabel}
                />
                <Button type="submit" variant="secondary" disabled={busy}>
                  {LOGIN.devButton}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
