"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Snackbar / toast: a short message in the corner confirming (or failing) an
 * action, so a click never leaves the rep wondering "did that work?".
 *
 *   const toast = useToast();
 *   toast.success("Voicemail saved for Acme.");
 *   toast.error(error.message);
 *
 * shadcn-style (Radix-free, Tailwind + lucide, no extra packages). Success/info
 * fade after 4.5s, errors stay 8s; every one has a close button. Mounted once in
 * components/providers.tsx.
 */
type Tone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
  description?: string;
}

interface ToastApi {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLE: Record<Tone, { color: string; Icon: typeof Info }> = {
  success: { color: "var(--success)", Icon: CheckCircle2 },
  error: { color: "var(--danger)", Icon: AlertCircle },
  info: { color: "var(--info)", Icon: Info },
};

let nextId = 1;
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, message: string, description?: string) => {
      const id = nextId++;
      setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, tone, message, description }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4500),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const current = timers.current;
    return () => current.forEach(clearTimeout);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, d) => push("success", m, d),
      error: (m, d) => push("error", m, d),
      info: (m, d) => push("info", m, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((t) => {
          const { color, Icon } = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                "toast-enter pointer-events-auto flex items-start gap-3 rounded-[10px] border border-border bg-card px-4 py-3 shadow-[var(--shadow-overlay)]",
              )}
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[0.92rem] font-semibold leading-snug text-text">{t.message}</p>
                {t.description && (
                  <p className="mt-0.5 text-[0.82rem] leading-snug text-muted">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="cursor-pointer rounded p-0.5 text-muted hover:text-text"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider> (see components/providers.tsx)");
  return ctx;
}
