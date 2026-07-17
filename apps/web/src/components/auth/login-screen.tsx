"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Input, Label } from "@omnio/ui";
import { useLogin } from "@/lib/api/auth";
import { AuthShell } from "./auth-shell";

/** Returning admin sign-in. */
export function LoginScreen() {
  const t = useTranslations("auth");
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ username: username.trim(), password });
  }

  return (
    <AuthShell title={t("loginTitle")} subtitle={t("loginSubtitle")}>
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
            autoComplete="current-password"
            required
          />
        </div>
        {login.isError ? (
          <Alert variant="danger">
            <AlertDescription>{login.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={login.isPending || !username || !password}>
          {login.isPending ? t("signingIn") : t("signIn")}
        </Button>
      </form>
    </AuthShell>
  );
}
