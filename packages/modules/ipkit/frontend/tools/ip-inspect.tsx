"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Input, Label } from "@omnio/ui";
import { parseIp } from "../../shared/ip.ts";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="contents">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd dir="ltr" className="text-start font-mono text-sm break-all">
        {value}
      </dd>
    </div>
  );
}

/** IP address inspector — parses and classifies IPv4/IPv6 on your device. */
export default function IpInspectTool() {
  const t = useTranslations("mod-ipkit");
  const [text, setText] = useState("192.168.1.1");

  const info = useMemo(() => parseIp(text), [text]);
  const attempted = text.trim().length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ip-input">{t("ui.address")}</Label>
        <Input
          id="ip-input"
          dir="ltr"
          className="font-mono"
          value={text}
          spellCheck={false}
          autoComplete="off"
          placeholder="192.168.1.1 / 2001:db8::1"
          aria-invalid={attempted && !info ? true : undefined}
          aria-describedby={attempted && !info ? "ip-error" : undefined}
          onChange={(event) => setText(event.target.value)}
        />
        {attempted && !info ? (
          <p id="ip-error" role="alert" className="text-sm text-danger">
            {t("ui.invalid")}
          </p>
        ) : null}
      </div>

      {info ? (
        <section
          aria-live="polite"
          className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface p-4"
        >
          <div className="flex items-center gap-2">
            <Badge>{info.version === 4 ? "IPv4" : "IPv6"}</Badge>
            <Badge variant="neutral">{t(`ui.kind.${info.kind}`)}</Badge>
          </div>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            {info.version === 4 ? (
              <>
                <InfoRow label={t("ui.integer")} value={String(info.integer)} />
                <InfoRow label={t("ui.hex")} value={info.hex} />
                <InfoRow label={t("ui.binary")} value={info.binary} />
              </>
            ) : (
              <>
                <InfoRow label={t("ui.expanded")} value={info.expanded} />
                <InfoRow label={t("ui.compressed")} value={info.compressed} />
              </>
            )}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
