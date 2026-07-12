"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ContrastPreference = "normal" | "high";

const STORAGE_KEY = "omnio-contrast";

/**
 * Inline this in <head> (before paint) to avoid a contrast flash —
 * mirrors what next-themes does for the theme axis.
 */
export const contrastInitScript = `(function(){try{var c=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(c==="high"||(c===null&&window.matchMedia("(prefers-contrast: more)").matches)){document.documentElement.setAttribute("data-contrast","high")}}catch(e){}})()`;

interface ContrastContextValue {
  contrast: ContrastPreference;
  setContrast: (value: ContrastPreference) => void;
}

const ContrastContext = createContext<ContrastContextValue | null>(null);

export function ContrastProvider({ children }: { children: React.ReactNode }) {
  const [contrast, setContrastState] = useState<ContrastPreference>("normal");

  // Adopt whatever the init script decided before hydration.
  useEffect(() => {
    setContrastState(
      document.documentElement.getAttribute("data-contrast") === "high" ? "high" : "normal",
    );
  }, []);

  const setContrast = useCallback((value: ContrastPreference) => {
    setContrastState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable (private mode) — attribute still applies for the session
    }
    if (value === "high") {
      document.documentElement.setAttribute("data-contrast", "high");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
  }, []);

  return (
    <ContrastContext.Provider value={{ contrast, setContrast }}>
      {children}
    </ContrastContext.Provider>
  );
}

export function useContrast(): ContrastContextValue {
  const ctx = useContext(ContrastContext);
  if (!ctx) throw new Error("useContrast must be used within ContrastProvider");
  return ctx;
}
