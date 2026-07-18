"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Density = "compact" | "comfortable" | "large";

const STORAGE_KEY = "omnio-density";
const DEFAULT_DENSITY: Density = "comfortable";
const VALUES: readonly Density[] = ["compact", "comfortable", "large"];

/** Inline in <head> before paint — same mechanism as styleInitScript. */
export const densityInitScript = `(function(){try{var d=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});if(d&&d!==${JSON.stringify(DEFAULT_DENSITY)}&&${JSON.stringify(
  VALUES,
)}.indexOf(d)!==-1){document.documentElement.setAttribute("data-density",d)}}catch(e){}})()`;

interface DensityContextValue {
  density: Density;
  setDensity: (value: Density) => void;
}

const DensityContext = createContext<DensityContextValue | null>(null);

function readAttribute(): Density {
  const attr = document.documentElement.getAttribute("data-density");
  return (VALUES as readonly string[]).includes(attr ?? "") ? (attr as Density) : DEFAULT_DENSITY;
}

/**
 * The density axis — Compact, Comfortable (default), or Large — scales
 * shared control heights (buttons, inputs, selects, icon buttons) app-wide
 * from one Settings control, independent of style/theme/accent
 * (docs/architecture/05-design-system.md §7). Larger touch targets for
 * mobile/low-vision users are one setting away, not a per-tool concern.
 */
export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);

  useEffect(() => {
    setDensityState(readAttribute());
  }, []);

  const setDensity = useCallback((value: Density) => {
    setDensityState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable (private mode) — attribute still applies for the session
    }
    if (value === DEFAULT_DENSITY) {
      document.documentElement.removeAttribute("data-density");
    } else {
      document.documentElement.setAttribute("data-density", value);
    }
  }, []);

  return (
    <DensityContext.Provider value={{ density, setDensity }}>{children}</DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error("useDensity must be used within DensityProvider");
  return ctx;
}
