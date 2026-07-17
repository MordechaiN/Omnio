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
    function isEditable(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    }

    function onKeyDown(event: KeyboardEvent) {
      // ⌘K / Ctrl+K toggles the palette from anywhere.
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      // "/" focuses search — but only when not already typing (keyboard map,
      // docs/architecture/04-frontend.md §6).
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !isEditable(event.target)) {
        event.preventDefault();
        setOpen(true);
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
