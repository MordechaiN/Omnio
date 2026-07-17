"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Input, Label } from "@omnio/ui";
import { useSetup } from "@/lib/api/auth";
import { AuthShell } from "./auth-shell";

const MIN_PASSWORD = 12;

/** First-run: create the single admin account. Setup signs you straight in. */
export function SetupScreen() {
  const t = useTranslations("auth");
  const setup = useSetup();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) return;
    setup.mutate({ username: username.trim(), password });
  }

  return (
    <AuthShell title={t("setupTitle")} subtitle={t("setupSubtitle")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">{t("username")}</Label>
          <Input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            aria-invalid={tooShort}
            required
          />
          <p className="text-xs text-text-muted">{t("passwordHint", { min: MIN_PASSWORD })}</p>
        </div>
        {setup.isError ? (
          <Alert variant="danger">
            <AlertDescription>{setup.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={setup.isPending || password.length < MIN_PASSWORD}>
          {setup.isPending ? t("creating") : t("createAccount")}
        </Button>
      </form>
    </AuthShell>
  );
}
