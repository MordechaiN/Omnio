"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Spinner } from "@omnio/ui";
import { useAuthStatus } from "@/lib/api/auth";
import { AuthShell } from "./auth-shell";
import { LoginScreen } from "./login-screen";
import { ServerReachabilityProvider } from "./server-reachability";
import { SetupScreen } from "./setup-screen";

const OFFLINE_KEY = "omnio.offline";

/**
 * Whether the person already chose to work without the server.
 *
 * Session-scoped, so it survives navigation and reload — the choice was
 * originally component state, which meant opening any tool threw them straight
 * back to the retry screen they had just dismissed — but is forgotten by
 * tomorrow, and ignored the moment the api answers again.
 */
function readOfflineChoice(): boolean {
  try {
    return sessionStorage.getItem(OFFLINE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberOfflineChoice(): void {
  try {
    sessionStorage.setItem(OFFLINE_KEY, "1");
  } catch {
    // Without storage the choice simply lasts until the next navigation.
  }
}

function forgetOfflineChoice(): void {
  try {
    sessionStorage.removeItem(OFFLINE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * The session gate. Everything behind it is the private workspace; in front of
 * it, first-run setup or login. A single-admin instance has exactly one account
 * (decision D2), so this is the whole front door.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");
  const status = useAuthStatus();
  /**
   * Starts false and is restored after mount, never read during the first
   * render: `sessionStorage` does not exist on the server, so seeding state
   * from it made the server and client disagree and React threw a hydration
   * error on every reload. The restore lands while the status query is still
   * pending, so the spinner covers it and nothing flickers.
   */
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (readOfflineChoice()) setOffline(true);
  }, []);

  // The server came back. Forget the choice so the next visit starts normally.
  useEffect(() => {
    if (status.data) forgetOfflineChoice();
  }, [status.data]);

  /**
   * Elected to work without the api. Everything client-side still works; the
   * shell says so, and the few server-tier surfaces refuse honestly.
   *
   * Keyed on the absence of an answer rather than on `isError`. A query that
   * keeps retrying a refused connection sits in `pending`, not `error`, so an
   * `isError` guard fell through to the loading spinner and showed a blank
   * screen instead of the app. The moment the api does answer, this yields to
   * the normal flow below.
   */
  if (offline && !status.data) {
    return (
      <ServerReachabilityProvider value={{ online: false }}>{children}</ServerReachabilityProvider>
    );
  }

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
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => void status.refetch()}
            disabled={status.isFetching}
          >
            {status.isFetching ? t("loading") : t("retry")}
          </Button>
          {/* The way out of a dead end. Most of Omnio never needed the server. */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              rememberOfflineChoice();
              setOffline(true);
            }}
          >
            {t("continueOffline")}
          </Button>
          <p className="text-center text-xs text-text-muted">{t("continueOfflineHint")}</p>
        </div>
      </AuthShell>
    );
  }

  if (status.data.needsSetup) return <SetupScreen />;
  if (!status.data.authenticated) return <LoginScreen />;

  return <ServerReachabilityProvider value={{ online: true }}>{children}</ServerReachabilityProvider>;
}
