"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const KEY = "elipse-theme";
const EVENT = "elipse-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** The pre-hydration script in app/layout.tsx already applied the attribute. */
function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Matches st.session_state["theme"] defaulting to "dark". */
function getServerSnapshot(): Theme {
  return "dark";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    if (next === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private mode / blocked storage — the DOM attribute still applies
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { theme, setTheme };
}
