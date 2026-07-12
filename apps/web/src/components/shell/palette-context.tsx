"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface PaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

/** Owns palette visibility and the global ⌘K / Ctrl+K shortcut. */
export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const setOpenStable = useCallback((value: boolean) => setOpen(value), []);
  const value = useMemo(() => ({ open, setOpen: setOpenStable }), [open, setOpenStable]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within PaletteProvider");
  return ctx;
}
