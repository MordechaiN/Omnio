"use client";

import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@omnio/ui";
import { LogOut } from "lucide-react";
import { useAuthStatus, useLogout } from "@/lib/api/auth";

/** The signed-in identity and sign-out, in the top bar. */
export function UserMenu() {
  const t = useTranslations("auth");
  const status = useAuthStatus();
  const logout = useLogout();

  const username = status.data?.username ?? "";
  if (!status.data?.authenticated) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("account")}
          className="flex size-8 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent-subtle-fg transition-colors duration-(--motion-fast) hover:bg-accent-subtle/80"
        >
          {username.charAt(0).toUpperCase() || "?"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("signedInAs", { username })}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()}>
          <LogOut size={16} />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
