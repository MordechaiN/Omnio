"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import { Button } from "@omnio/ui";
import { ArrowRight } from "lucide-react";

/** Sibling tool href that keeps the current locale prefix intact. */
function siblingHref(toolId: string): string {
  return window.location.pathname.replace(/\/tool\/([^/]+)\/[^/]+$/, `/tool/$1/${toolId}`);
}

/**
 * The workflow chain: once a tool has a result, offer the logical next steps.
 * `produce` builds the current output as a File; choosing a target hands it to
 * the sibling tool, which opens with the file already loaded — no re-download,
 * no manual reopen. The row only renders when there is something to send.
 */
export function SendTo({
  produce,
  targets,
  original,
}: {
  produce: () => Promise<{ blob: Blob; name: string } | null>;
  targets: string[];
  /** When provided, adds "Compare with original" sending [original, result]. */
  original?: File;
}) {
  const t = useTranslations("mod-imagekit");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function send(toolId: string) {
    setBusy(true);
    try {
      const output = await produce();
      if (!output) return;
      const file = new File([output.blob], output.name, { type: output.blob.type });
      // Let the shell's session workspace remember this output.
      window.dispatchEvent(new CustomEvent("omnio:session-file", { detail: file }));
      setPendingFiles([file]);
      router.push(siblingHref(toolId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface px-4 py-3">
      <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
        <ArrowRight size={14} aria-hidden="true" className="rtl:rotate-180" />
        {t("ui.chainTitle")}
      </span>
      {targets.map((toolId) => (
        <Button
          key={toolId}
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => void send(toolId)}
        >
          {t(`tools.${toolId}.name` as Parameters<typeof t>[0])}
        </Button>
      ))}
      {original ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() =>
            void (async () => {
              setBusy(true);
              try {
                const output = await produce();
                if (!output) return;
                const file = new File([output.blob], output.name, { type: output.blob.type });
                window.dispatchEvent(new CustomEvent("omnio:session-file", { detail: file }));
                setPendingFiles([original, file]);
                router.push(siblingHref("image-compare"));
              } finally {
                setBusy(false);
              }
            })()
          }
        >
          {t("ui.compareOriginal")}
        </Button>
      ) : null}
    </div>
  );
}
