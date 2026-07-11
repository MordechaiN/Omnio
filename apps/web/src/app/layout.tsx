import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Omnio — Everything. One Workspace.",
  description:
    "A self-hosted, privacy-first workspace for viewing, editing, converting and managing virtually every common file format.",
};

// lang/dir become locale-driven when i18n lands in M4/M5
// (docs/architecture/04-frontend.md §5).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
