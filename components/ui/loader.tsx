import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Added 2026-09-22 -- the user kept clicking a button several times in a row ("ek button ko 5 bar click
 * kr rhy hoty hein, pata nhi chalta k woh loading stage me hai") because a slow backend gave no visual
 * sign a click or a page change was still in flight. `Button`'s own `loading` prop (components/ui/button.tsx)
 * uses this for in-place spinners; `app/(workspace)/loading.tsx` uses `PageLoader` for full-page route
 * transitions. Same `Loader2`/`animate-spin` pattern the auth forms already used (sign-in-form.tsx).
 */
export function Loader({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

export function PageLoader() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
