"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, IconButton, Input, Label, toast } from "@omnio/ui";
import { X } from "lucide-react";

/** URL inspector — break a URL into parts and edit its query parameters. */
export default function UrlInspectTool() {
  const t = useTranslations("mod-urlkit");
  const [text, setText] = useState("https://example.com/path/page?utm_source=mail&q=omnio#top");

  let url: URL | null = null;
  try {
    url = new URL(text.trim());
  } catch {
    url = null;
  }
  const params = url ? [...url.searchParams.entries()] : [];

  function rebuild(mutate: (next: URL) => void) {
    if (!url) return;
    const next = new URL(url.toString());
    mutate(next);
    setText(next.toString());
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="url-input">{t("ui.urlLabel")}</Label>
        <Input
          id="url-input"
          dir="ltr"
          className="font-mono"
          value={text}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={text.trim() !== "" && !url ? true : undefined}
          onChange={(event) => setText(event.target.value)}
        />
        {text.trim() !== "" && !url ? (
          <p role="alert" className="text-sm text-danger">
            {t("ui.urlInvalid")}
          </p>
        ) : null}
      </div>

      {url ? (
        <>
          <dl className="grid gap-x-6 gap-y-1.5 rounded-lg border border-border-subtle bg-surface p-4 sm:grid-cols-[auto_1fr]">
            {(
              [
                ["protocol", url.protocol.replace(":", "")],
                ["host", url.hostname],
                ["port", url.port || t("ui.defaultPort")],
                ["path", url.pathname],
                ["hash", url.hash ? url.hash.slice(1) : "—"],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-sm text-text-muted">{t(`ui.part.${key}`)}</dt>
                <dd dir="ltr" className="text-start font-mono text-sm break-all">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <section className="flex flex-col gap-2" aria-label={t("ui.paramsTitle")}>
            <h2 className="text-sm font-semibold text-text-secondary">
              {t("ui.paramsTitle")}{" "}
              <Badge variant="neutral" className="ms-1">
                {params.length}
              </Badge>
            </h2>
            {params.length === 0 ? (
              <p className="text-sm text-text-muted">{t("ui.noParams")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {params.map(([key, value], index) => (
                  <li
                    key={`${key}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-1.5"
                  >
                    <code dir="ltr" className="shrink-0 font-mono text-sm font-medium">
                      {key}
                    </code>
                    <span aria-hidden="true" className="text-text-disabled">
                      =
                    </span>
                    <Input
                      dir="ltr"
                      className="h-8 flex-1 font-mono text-sm"
                      aria-label={t("ui.paramValue", { key })}
                      value={value}
                      onChange={(event) =>
                        rebuild((next) => next.searchParams.set(key, event.target.value))
                      }
                    />
                    <IconButton
                      aria-label={t("ui.removeParam", { key })}
                      icon={X}
                      size="sm"
                      variant="ghost"
                      onClick={() => rebuild((next) => next.searchParams.delete(key))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div>
            <Button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(url!.toString());
                toast(t("ui.copied"));
              }}
            >
              {t("ui.copyUrl")}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
