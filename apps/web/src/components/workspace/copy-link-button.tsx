"use client";

import { useTranslations } from "next-intl";
import { IconButton, toast } from "@omnio/ui";
import { Link2 } from "lucide-react";

/** Copy the tool's URL — the quickest way to hand a tool to someone else. */
export function CopyLinkButton() {
  const t = useTranslations("toolPage");
  return (
    <IconButton
      aria-label={t("copyLink")}
      icon={Link2}
      variant="ghost"
      size="sm"
      className="size-9"
      onClick={() => {
        void navigator.clipboard.writeText(window.location.href.split("?")[0]!);
        toast(t("linkCopied"));
      }}
    />
  );
}
