import { cn } from "@/lib/utils";

/**
 * A grey placeholder block with a soft moving shimmer, shaped like the content that is about to appear (user,
 * 2026-11-13: while data loads "surface bilkul khali dikh rhi hoti hai, lagta nahi kuch load ho rha hai"). Use
 * a few of them where a page / card / table will be; they disappear the moment the real content takes over.
 * Motion is skipped for people who ask their OS for reduced motion (see .skeleton in globals.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[8px]", className)} aria-hidden />;
}

/**
 * Placeholder for just the DATA part of a page (search box + a few list rows) -- the page's heading and anything
 * else already loaded stay on screen around it (user, 2026-11-13: "placeholder sirf us component ka jo load ho
 * raha hai, jo data load ho chuka wo dikh jaye").
 */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <Skeleton className="h-10 w-full max-w-sm" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-[12px]" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
