import { Card } from "@/components/ui/card";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card accent="info" className="text-[0.92rem] text-muted">
      {children}
    </Card>
  );
}
