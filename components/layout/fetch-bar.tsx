"use client";

import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";

/**
 * A thin line along the very top of the screen while anything is loading for the first time (user, 2026-11-13:
 * nothing on screen said data was still coming). Only counts queries that have NO data yet, so the quiet
 * background refreshes (notification polling, the 60s report refresh) never flash it. It waits 200 ms before
 * showing, so a fast load does not flicker.
 */
export function FetchBar() {
  const loading = useIsFetching({ predicate: (q) => q.state.data === undefined }) > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading) {
      const off = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(off);
    }
    const on = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(on);
  }, [loading]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden" role="status" aria-label="Loading">
      <div className="fetch-bar-slide h-full w-2/5 rounded-full bg-accent" />
    </div>
  );
}
