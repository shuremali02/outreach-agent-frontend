"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * In-app confirmation dialog, replacing the browser's native confirm() -- that
 * one shows "<site>.vercel.app says ..." with a bare OK/Cancel and no room to
 * explain what happens (the team lead could not tell whether "Closed Lost"
 * deleted the lead, 2026-09-19).
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Remove Acme?", description: "...", tone: "danger" }))) return;
 *
 * One dialog is mounted for the whole app (components/providers.tsx); confirm()
 * resolves true on the confirm button, false on Cancel / Escape / outside click.
 */
export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" = red confirm button and focus starts on Cancel. */
  tone?: "default" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // A second confirm() while one is open cancels the first (never leaves a promise hanging).
    resolver.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }

  const danger = options?.tone === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/55" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[90] w-[440px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-border bg-card p-6 shadow-[var(--shadow-overlay)]"
            // "danger": land on Cancel so a stray Enter cannot delete anything.
            onOpenAutoFocus={(e) => {
              if (danger) {
                e.preventDefault();
                (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-cancel]")?.focus();
              }
            }}
          >
            <div className="flex items-start gap-3">
              <Icon
                className="mt-0.5 h-6 w-6 shrink-0"
                style={{ color: danger ? "var(--danger)" : "var(--accent)" }}
                aria-hidden
              />
              <div className="min-w-0">
                <Dialog.Title className="text-[1.1rem] font-semibold leading-snug text-text">
                  {options?.title}
                </Dialog.Title>
                <Dialog.Description asChild>
                  <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed text-muted">
                    {options?.description ?? ""}
                  </p>
                </Dialog.Description>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" data-cancel onClick={() => settle(false)}>
                {options?.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant="primary"
                className={cn(danger && "!bg-danger hover:!bg-danger/85")}
                onClick={() => settle(true)}
              >
                {options?.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider> (see components/providers.tsx)");
  return ctx;
}
