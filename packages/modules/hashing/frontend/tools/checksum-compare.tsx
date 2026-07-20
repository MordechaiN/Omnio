"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Input, Label } from "@omnio/ui";
import { toHex, type HashAlgorithm } from "../../shared/hash.ts";

const ALGORITHM: HashAlgorithm = "SHA-256";

interface Slot {
  label: string;
  hash: string | null;
  busy: boolean;
}

async function hashFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(ALGORITHM, await file.arrayBuffer());
  return toHex(digest);
}

/** Checksum compare — verify two files (or a file and a known hash) match. */
export default function ChecksumCompareTool() {
  const t = useTranslations("mod-hashing");
  const [a, setA] = useState<Slot>({ label: "", hash: null, busy: false });
  const [b, setB] = useState<Slot>({ label: "", hash: null, busy: false });
  const [expected, setExpected] = useState("");

  async function pick(setSlot: (slot: Slot) => void, file: File) {
    setSlot({ label: file.name, hash: null, busy: true });
    const hash = await hashFile(file);
    setSlot({ label: file.name, hash, busy: false });
  }

  const normalizedExpected = expected.trim().toLowerCase();
  const matchAB = a.hash !== null && b.hash !== null ? a.hash === b.hash : null;
  const matchExpected =
    a.hash !== null && normalizedExpected !== "" ? a.hash === normalizedExpected : null;

  function Picker({ slot, onFile, id }: { slot: Slot; onFile: (file: File) => void; id: string }) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{t(`ui.${id}` as Parameters<typeof t>[0])}</Label>
        <input
          id={id}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
          }}
          className="text-sm"
        />
        {slot.busy ? (
          <p className="text-sm text-text-muted">{t("ui.working")}</p>
        ) : slot.hash ? (
          <code dir="ltr" className="truncate font-mono text-xs text-text-secondary">{slot.hash}</code>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Picker slot={a} onFile={(file) => pick(setA, file)} id="checksumFileA" />
        <Picker slot={b} onFile={(file) => pick(setB, file)} id="checksumFileB" />
      </div>

      {matchAB !== null ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
            matchAB ? "border-accent/40 bg-accent-subtle" : "border-danger/40 bg-surface"
          }`}
        >
          <span aria-hidden="true">{matchAB ? "✅" : "❌"}</span>
          <span className="text-sm font-medium">
            {matchAB ? t("ui.checksumMatch") : t("ui.checksumMismatch")}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checksum-expected">{t("ui.checksumExpected")}</Label>
        <Input
          id="checksum-expected"
          dir="ltr"
          className="font-mono"
          value={expected}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setExpected(event.target.value)}
        />
        {matchExpected !== null ? (
          <Badge variant={matchExpected ? "accent" : "neutral"} className="self-start">
            {matchExpected ? t("ui.checksumMatch") : t("ui.checksumMismatch")}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-text-muted">{t("ui.checksumPrivacy")}</p>
    </div>
  );
}
