"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Checkbox, Input, Label } from "@omnio/ui";
import {
  modeToOctal,
  modeToSymbolic,
  octalToMode,
  symbolicToMode,
  PERMISSIONS,
  ROLES,
  type Mode,
} from "../../shared/chmod.ts";

/** Unix permission calculator — three synced views of the same mode. */
export default function ChmodCalcTool() {
  const t = useTranslations("mod-chmod");
  const [mode, setMode] = useState<Mode>(() => octalToMode("754")!);
  // Text fields keep their own draft so a half-typed value doesn't get
  // clobbered by normalization; they sync back into `mode` once valid.
  const [octalDraft, setOctalDraft] = useState("754");
  const [symbolicDraft, setSymbolicDraft] = useState(modeToSymbolic(octalToMode("754")!));

  function apply(next: Mode) {
    setMode(next);
    setOctalDraft(modeToOctal(next));
    setSymbolicDraft(modeToSymbolic(next));
  }

  const octalValid = octalToMode(octalDraft) !== null;
  const symbolicValid = symbolicToMode(symbolicDraft) !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chmod-octal">{t("ui.octal")}</Label>
          <Input
            id="chmod-octal"
            dir="ltr"
            className="font-mono"
            value={octalDraft}
            maxLength={3}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={octalValid ? undefined : true}
            onChange={(event) => {
              const value = event.target.value;
              setOctalDraft(value);
              const next = octalToMode(value);
              if (next) {
                setMode(next);
                setSymbolicDraft(modeToSymbolic(next));
              }
            }}
          />
          {!octalValid ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.octalInvalid")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chmod-symbolic">{t("ui.symbolic")}</Label>
          <Input
            id="chmod-symbolic"
            dir="ltr"
            className="font-mono"
            value={symbolicDraft}
            maxLength={9}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={symbolicValid ? undefined : true}
            onChange={(event) => {
              const value = event.target.value;
              setSymbolicDraft(value);
              const next = symbolicToMode(value);
              if (next) {
                setMode(next);
                setOctalDraft(modeToOctal(next));
              }
            }}
          />
          {!symbolicValid ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.symbolicInvalid")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
        <table className="w-full text-sm">
          <caption className="sr-only">{t("ui.matrixCaption")}</caption>
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th scope="col" className="p-3 text-start font-medium">
                {t("ui.role")}
              </th>
              {PERMISSIONS.map((permission) => (
                <th key={permission} scope="col" className="p-3 text-center font-medium">
                  {t(`ui.permission.${permission}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((role) => (
              <tr key={role} className="border-b border-border-subtle last:border-0">
                <th scope="row" className="p-3 text-start font-medium">
                  {t(`ui.roleName.${role}`)}
                </th>
                {PERMISSIONS.map((permission) => (
                  <td key={permission} className="p-3 text-center">
                    <Checkbox
                      aria-label={t("ui.cellLabel", {
                        role: t(`ui.roleName.${role}`),
                        permission: t(`ui.permission.${permission}`),
                      })}
                      checked={mode[role][permission]}
                      onCheckedChange={(checked) =>
                        apply({
                          ...mode,
                          [role]: { ...mode[role], [permission]: checked === true },
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-text-muted">
        {t("ui.commandHint")}{" "}
        <code dir="ltr" className="rounded-sm bg-surface-raised px-1.5 py-0.5 font-mono text-text">
          chmod {modeToOctal(mode)} file
        </code>
      </p>
    </div>
  );
}
