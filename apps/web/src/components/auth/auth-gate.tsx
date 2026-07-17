"use client";

import { useTranslations } from "next-intl";
import { Button, Spinner } from "@omnio/ui";
import { useAuthStatus } from "@/lib/api/auth";
import { AuthShell } from "./auth-shell";
import { LoginScreen } from "./login-screen";
import { SetupScreen } from "./setup-screen";

/**
 * The session gate. Everything behind it is the private workspace; in front of
 * it, first-run setup or login. A single-admin instance has exactly one account
 * (decision D2), so this is the whole front door.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");
  const status = useAuthStatus();

  if (status.isPending) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-bg"
        role="status"
        aria-live="polite"
      >
        <Spinner size={24} label={t("loading")} />
      </div>
    );
  }

  if (status.isError) {
    return (
      <AuthShell title={t("offlineTitle")} subtitle={t("offlineSubtitle")}>
        <Button
          className="w-full"
          onClick={() => void status.refetch()}
          disabled={status.isFetching}
        >
          {status.isFetching ? t("loading") : t("retry")}
        </Button>
      </AuthShell>
    );
  }

  if (status.data.needsSetup) return <SetupScreen />;
  if (!status.data.authenticated) return <LoginScreen />;

  return <>{children}</>;
}
