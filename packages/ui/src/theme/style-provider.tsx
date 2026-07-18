"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type VisualStyle = "classic" | "modern" | "minimal" | "accessible";

const STORAGE_KEY = "omnio-style";
const DEFAULT_STYLE: VisualStyle = "modern";
const VALUES: readonly VisualStyle[] = ["classic", "modern", "minimal", "accessible"];

/**
 * Inline this in <head> (before paint) to avoid a flash — mirrors
 * contrastInitScript. "modern" is the shipped default and needs no attribute
 * at all, so only a stored non-default preference has anything to restore
 * before first paint.
 */
export const styleInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(s&&s!==${JSON.stringify(DEFAULT_STYLE)}&&${JSON.stringify(
  VALUES,
)}.indexOf(s)!==-1){document.documentElement.setAttribute("data-style",s)}}catch(e){}})()`;

interface StyleContextValue {
  style: VisualStyle;
  setStyle: (value: VisualStyle) => void;
}

const StyleContext = createContext<StyleContextValue | null>(null);

function readAttribute(): VisualStyle {
  const attr = document.documentElement.getAttribute("data-style");
  return (VALUES as readonly string[]).includes(attr ?? "") ? (attr as VisualStyle) : DEFAULT_STYLE;
}

/**
 * The visual-style axis — Classic, Modern (default), Minimal, or Accessible —
 * independent of theme (light/dark), accent color, and contrast. Switching is
 * instant and fully reversible: it only ever flips one attribute on <html>,
 * and every style's values are still shipped
 * (docs/architecture/05-design-system.md §2, §7).
 */
export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<VisualStyle>(DEFAULT_STYLE);

  // Adopt whatever the init script decided before hydration.
  useEffect(() => {
    setStyleState(readAttribute());
  }, []);

  const setStyle = useCallback((value: VisualStyle) => {
    setStyleState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable (private mode) — attribute still applies for the session
    }
    if (value === DEFAULT_STYLE) {
      document.documentElement.removeAttribute("data-style");
    } else {
      document.documentElement.setAttribute("data-style", value);
    }
  }, []);

  return <StyleContext.Provider value={{ style, setStyle }}>{children}</StyleContext.Provider>;
}

export function useStyle(): StyleContextValue {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useStyle must be used within StyleProvider");
  return ctx;
}
