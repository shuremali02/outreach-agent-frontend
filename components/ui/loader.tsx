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
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center px-8">
      <div className="w-full max-w-xs">
        <BarLoader />
      </div>
    </div>
  );
}

/**
 * An indeterminate "moving line" loader for a block/section waiting on a plain fetch with no real
 * percentage to report (user, 2026-10-01: "loader woh line wala jo chalti hai jab tk woh show nhi hoti hain
 * tb tk ... full load hone pr complete ho jati hai", confirmed to apply "har bari/section loading pe").
 * Used for page transitions (PageLoader above), and wherever a whole section/form/list is waiting on data
 * -- Cold Call Desk's Already Tried dropdown, the Edit Lead form, Problem Desk. NOT for a button's own
 * in-place spinner (Button's `loading` prop keeps using Loader -- a bar doesn't fit inline in a button, the
 * user's own scoping call). Unlike components/ingest/job-progress.tsx (a real backend-reported percentage
 * for a long AI/scan job), this never claims a specific % done -- it just shows something is in flight, and
 * disappears the moment the real content takes its place; see app/globals.css bar-loader-grow.
 */
export function BarLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-input">
        <div className="bar-loader-grow h-full rounded-full bg-accent" />
      </div>
      {label ? <span className="text-[0.85rem] text-muted">{label}</span> : <span className="sr-only">Loading…</span>}
    </div>
  );
}
