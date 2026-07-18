"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Input, Label } from "@omnio/ui";
import { calculateCidr } from "../../shared/cidr.ts";

/** IPv4 CIDR / subnet calculator — on your device. */
export default function CidrTool() {
  const t = useTranslations("mod-subnet");
  const [input, setInput] = useState("192.168.1.0/24");
  const result = useMemo(() => calculateCidr(input), [input]);

  const rows: Array<
    ["networkAddress" | "broadcastAddress" | "netmask" | "wildcard" | "firstHost" | "lastHost", string | undefined]
  > = [
    ["networkAddress", result.networkAddress],
    ["broadcastAddress", result.broadcastAddress],
    ["netmask", result.netmask],
    ["wildcard", result.wildcard],
    ["firstHost", result.firstHost],
    ["lastHost", result.lastHost],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cidr-input">{t("ui.cidr")}</Label>
        <Input
          id="cidr-input"
          dir="ltr"
          className="font-mono"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="192.168.1.0/24"
        />
      </div>

      {result.error ? (
        <Alert variant="warning">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : result.networkAddress ? (
        <div className="flex flex-col gap-3">
          <dl className="grid gap-2 sm:grid-cols-2">
            {rows.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <dt className="text-sm text-text-muted">{t(`ui.${key}`)}</dt>
                <dd dir="ltr" className="font-mono text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-text-muted">
            {t("ui.hosts", { total: result.totalHosts ?? 0, usable: result.usableHosts ?? 0 })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
