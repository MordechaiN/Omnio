"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Kbd } from "@omnio/ui";
import { ShieldCheck, UploadCloud } from "lucide-react";

const SUPPORTED = ["Images", "PDF", "Video", "Audio", "Office", "ZIP", "Text"];

/**
 * The homepage hero — Omnio's permanent identity and single entry point.
 * This is the idle state, not the drag overlay (that lives in FileIntelligence
 * and still takes over while a drag is in progress). Choosing files here hands
 * them to the same intelligence flow via the `omnio:inspect` event, so there's
 * one code path for drop, paste, and click.
 */
export function DropHero() {
  const t = useTranslations("home");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="animate-rise flex flex-col items-center gap-6 pt-6 text-center sm:pt-10">
      <label className="group flex w-full max-w-xl cursor-pointer flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-surface px-6 py-12 transition-[border-color,background-color] duration-(--motion-base) ease-(--ease-out) hover:border-border hover:bg-surface-raised sm:py-16">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent-subtle text-accent-subtle-fg transition-transform duration-(--motion-base) ease-(--ease-out) group-hover:scale-105">
          <UploadCloud size={22} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">
            {t("heroTitle")}
          </h1>
          <p className="text-sm text-text-muted">
            {t.rich("heroSubtitle", {
              paste: () => <Kbd>⌘V</Kbd>,
            })}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          aria-label={t("heroChoose")}
          className="sr-only"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (files.length > 0) {
              window.dispatchEvent(
                new CustomEvent("omnio:inspect", { detail: { files, record: true } }),
              );
            }
          }}
        />
      </label>

      {/* The promise, stated where someone decides whether to trust Omnio with a
          contract or a passport scan — the first screen. Every tool page carries
          "runs on your device", but the landing page said nothing at all, which
          left a first-time visitor to infer the single most important fact about
          the product. The sentence was already written and translated; it was
          simply never rendered anywhere. */}
      {/* The promise, stated where someone decides whether to trust Omnio with a
          contract or a passport scan. Deliberately no tool count: Home stopped
          advertising how many tools exist, and reintroducing "123 tools" here
          traded a settled product decision for a marketing number. The privacy
          claim was the part worth surfacing.

          items-start, not center: the sentence wraps on a phone, where a
          vertically centred icon floats away from the text it marks. */}
      <p className="flex max-w-lg items-start justify-center gap-2 text-sm text-text-secondary">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <span>{t("privacyNote")}</span>
      </p>

      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-text-muted">
        {SUPPORTED.map((label, index) => (
          <span key={label} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true" className="text-text-disabled">·</span> : null}
            {label}
          </span>
        ))}
      </p>
    </section>
  );
}
