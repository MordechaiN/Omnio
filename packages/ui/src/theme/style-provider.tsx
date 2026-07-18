"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type VisualStyle = "friendly" | "classic";

const STORAGE_KEY = "omnio-style";

/**
 * Inline this in <head> (before paint) to avoid a flash — mirrors
 * contrastInitScript. "friendly" is the shipped default and needs no
 * attribute at all, so only a stored "classic" preference has anything to
 * restore before first paint.
 */
export const styleInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(s==="classic"){document.documentElement.setAttribute("data-style","classic")}}catch(e){}})()`;

interface StyleContextValue {
  style: VisualStyle;
  setStyle: (value: VisualStyle) => void;
}

const StyleContext = createContext<StyleContextValue | null>(null);

/**
 * The visual-style axis — "friendly" (default) or "classic" — independent of
 * theme (light/dark) and contrast. Switching is instant and fully reversible:
 * it only ever flips one attribute on <html>, and every classic value is
 * still shipped (docs/architecture/05-design-system.md §2).
 */
export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<VisualStyle>("friendly");

  // Adopt whatever the init script decided before hydration.
  useEffect(() => {
    setStyleState(
      document.documentElement.getAttribute("data-style") === "classic" ? "classic" : "friendly",
    );
  }, []);

  const setStyle = useCallback((value: VisualStyle) => {
    setStyleState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable (private mode) — attribute still applies for the session
    }
    if (value === "classic") {
      document.documentElement.setAttribute("data-style", "classic");
    } else {
      document.documentElement.removeAttribute("data-style");
    }
  }, []);

  return <StyleContext.Provider value={{ style, setStyle }}>{children}</StyleContext.Provider>;
}

export function useStyle(): StyleContextValue {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useStyle must be used within StyleProvider");
  return ctx;
}
