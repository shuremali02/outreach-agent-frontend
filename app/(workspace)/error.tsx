"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card accent="danger" className="max-w-2xl">
      <p className="date-eyebrow">Something went wrong</p>
      <h2 className="mb-2 text-xl font-semibold">This view failed to load</h2>
      {/* Message only — never render a stack trace to the browser. */}
      <p className="mb-4 text-[0.9rem] text-muted">{error.message}</p>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
