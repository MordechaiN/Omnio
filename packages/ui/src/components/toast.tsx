"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

export { toast };

export interface ToasterProps {
  /** Document direction — flips toast position and slide direction. */
  dir?: "ltr" | "rtl";
}

/** Mount once in the app shell. Styled entirely from tokens. */
export function Toaster({ dir = "ltr" }: ToasterProps) {
  return (
    <SonnerToaster
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      gap={8}
      toastOptions={{
        style: {
          background: "var(--overlay)",
          color: "var(--text)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-2)",
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
