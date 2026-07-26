"use client";

import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "@omnio/ui";
import { CloudOff } from "lucide-react";
import { useServerReachability } from "@/components/auth/server-reachability";

/**
 * A quiet mark that the server is not answering.
 *
 * Deliberately not a banner and not a toast. Working without the server is a
 * legitimate way to use Omnio rather than an error to apologise for — almost
 * everything runs in the browser regardless — so this states the fact where the
 * other status controls live and otherwise stays out of the way.
 */
export function OfflineBadge() {
  const t = useTranslations("shell");
  const { online } = useServerReachability();
  if (online) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex size-8 items-center justify-center rounded-md text-text-muted"
          role="status"
        >
          <CloudOff className="size-4" aria-hidden />
          <span className="sr-only">{t("offlineBadge")}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("offlineBadgeHint")}</TooltipContent>
    </Tooltip>
  );
}
