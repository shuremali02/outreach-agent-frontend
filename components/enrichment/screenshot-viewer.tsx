"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { Ico } from "@/components/ui/emoji-icon";

/**
 * In Streamlit this was st.checkbox — a workaround, because nested expanders
 * are forbidden and the lead card is already an expander. React has no such
 * limit, so it becomes a real collapsible.
 */
export function ScreenshotViewer({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="cursor-pointer text-[0.82rem] font-semibold text-muted hover:text-accent">
        <Ico e="🖼" /> {open ? "Hide" : "Show"} site screenshot
      </Collapsible.Trigger>
      <Collapsible.Content className="mt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={420}
          className="rounded-[8px] border border-border"
          loading="lazy"
        />
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
