"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Badge, Label, Textarea } from "@omnio/ui";
import { decodeJwt } from "../../shared/jwt.ts";

/** JWT decoder — inspect header, payload and claims on your device. */
export default function JwtDecodeTool() {
  const t = useTranslations("mod-jwt");
  const [token, setToken] = useState("");
  const result = useMemo(() => decodeJwt(token), [token]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jwt-input">{t("ui.token")}</Label>
        <Textarea
          id="jwt-input"
          dir="ltr"
          className="min-h-28 break-all font-mono text-sm"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={t("ui.placeholder")}
        />
        <p className="text-sm text-text-muted">{t("ui.note")}</p>
      </div>

      {result.error ? (
        <Alert variant="danger">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : result.header ? (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold">{t("ui.header")}</h3>
            <pre
              dir="ltr"
              className="overflow-x-auto rounded-lg border border-border bg-bg-muted p-3 font-mono text-sm"
            >
              {JSON.stringify(result.header, null, 2)}
            </pre>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("ui.claims")}</h3>
            <dl className="flex flex-col gap-2">
              {result.claims?.map((claim) => (
                <div
                  key={claim.key}
                  className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <dt className="font-mono text-sm font-semibold">{claim.key}</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span dir="ltr" className="break-all font-mono text-sm">
                      {claim.value}
                    </span>
                    {claim.date ? <Badge variant="neutral">{claim.date}</Badge> : null}
                    {claim.expired ? <Badge variant="danger">{t("ui.expired")}</Badge> : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}
    </div>
  );
}
