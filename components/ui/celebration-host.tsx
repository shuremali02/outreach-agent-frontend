"use client";

import { useEffect, useState } from "react";
import { Celebration } from "@/components/ui/celebration";

const EVENT = "elipse-celebrate";

/** Fire the "Client Closed" burst from anywhere (including a mutation hook). */
export function celebrate(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/**
 * Mounted once in Providers, so the burst survives the lead card / dialog that triggered it
 * unmounting. A closed lead leaves the Pipeline list the moment the cache updates; a celebrate state
 * kept inside that card was destroyed with it (2026-11-11 fix for "pipeline se Client Closed pe
 * celebration nahi aya").
 */
export function CelebrationHost() {
  const [runs, setRuns] = useState<number[]>([]);
  useEffect(() => {
    let n = 0;
    const onFire = () => setRuns((r) => [...r, ++n]);
    window.addEventListener(EVENT, onFire);
    return () => window.removeEventListener(EVENT, onFire);
  }, []);
  return (
    <>
      {runs.map((id) => (
        <Celebration key={id} onDone={() => setRuns((r) => r.filter((x) => x !== id))} />
      ))}
    </>
  );
}
