"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AccentColor = "indigo" | "blue" | "purple" | "green" | "orange";

const STORAGE_KEY = "omnio-accent";
const DEFAULT_ACCENT: AccentColor = "indigo";
const VALUES: readonly AccentColor[] = ["indigo", "blue", "purple", "green", "orange"];

/** Inline in <head> before paint — same mechanism as styleInitScript. */
export const accentInitScript = `(function(){try{var a=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(a&&a!==${JSON.stringify(DEFAULT_ACCENT)}&&${JSON.stringify(
  VALUES,
)}.indexOf(a)!==-1){document.documentElement.setAttribute("data-accent",a)}}catch(e){}})()`;

interface AccentContextValue {
  accent: AccentColor;
  setAccent: (value: AccentColor) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);

function readAttribute(): AccentColor {
  const attr = document.documentElement.getAttribute("data-accent");
  return (VALUES as readonly string[]).includes(attr ?? "") ? (attr as AccentColor) : DEFAULT_ACCENT;
}

/**
 * The accent-color axis — the one brand color, independent of style, theme,
 * and contrast. A Minimal install can be Orange-accented; an Accessible one
 * can be Green. Every accent clears the same WCAG gate as every other
 * (docs/architecture/05-design-system.md §7).
 */
export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(DEFAULT_ACCENT);

  useEffect(() => {
    setAccentState(readAttribute());
  }, []);

  const setAccent = useCallback((value: AccentColor) => {
    setAccentState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable (private mode) — attribute still applies for the session
    }
    if (value === DEFAULT_ACCENT) {
      document.documentElement.removeAttribute("data-accent");
    } else {
      document.documentElement.setAttribute("data-accent", value);
    }
  }, []);

  return <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>;
}

export function useAccent(): AccentContextValue {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within AccentProvider");
  return ctx;
}
