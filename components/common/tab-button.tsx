import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Shared Radix Tabs.Trigger styling — was copy-pasted independently into
 * ingest-drawer.tsx and discovery-form.tsx; extracted here so a style tweak
 * only needs to happen once.
 */
export function TabButton({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "cursor-pointer rounded-[8px] border border-border bg-card px-3 py-2 text-[0.82rem] font-semibold text-muted transition-colors",
        "data-[state=active]:border-transparent data-[state=active]:bg-accent data-[state=active]:text-white",
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}
