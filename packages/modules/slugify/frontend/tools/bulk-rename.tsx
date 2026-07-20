"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea, toast } from "@omnio/ui";
import { applyRenameRules, type RenameRule } from "../../shared/bulk-rename.ts";

/** Bulk rename — stack simple rules, preview the result on a whole list. */
export default function BulkRenameTool() {
  const t = useTranslations("mod-slugify");
  const [names, setNames] = useState("IMG_0001.jpg\nIMG_0002.jpg\nvacation photo.png");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseMode, setCaseMode] = useState<"" | "lower" | "upper" | "title">("");
  const [addSequence, setAddSequence] = useState(false);
  const [seqDigits, setSeqDigits] = useState(3);

  const list = names.split("\n").map((line) => line.trim()).filter(Boolean);
  const rules: RenameRule[] = [];
  if (find !== "") rules.push({ type: "findReplace", find, replace, useRegex });
  if (caseMode !== "") rules.push({ type: "case", mode: caseMode });
  if (addSequence) rules.push({ type: "sequence", start: 1, digits: seqDigits, separator: "-" });
  const renamed = applyRenameRules(list, rules);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="br-names">{t("ui.brNames")}</Label>
          <Textarea
            id="br-names"
            dir="ltr"
            className="min-h-40 font-mono text-sm"
            value={names}
            spellCheck={false}
            onChange={(event) => setNames(event.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="br-find">{t("ui.brFind")}</Label>
            <Input id="br-find" dir="ltr" value={find} onChange={(event) => setFind(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="br-replace">{t("ui.brReplace")}</Label>
            <Input id="br-replace" dir="ltr" value={replace} onChange={(event) => setReplace(event.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="br-regex" checked={useRegex} onCheckedChange={setUseRegex} />
          <Label htmlFor="br-regex">{t("ui.brRegex")}</Label>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="br-case">{t("ui.brCase")}</Label>
          <Select value={caseMode || "none"} onValueChange={(next) => setCaseMode(next === "none" ? "" : (next as typeof caseMode))}>
            <SelectTrigger id="br-case"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("ui.brCaseNone")}</SelectItem>
              <SelectItem value="lower">{t("ui.brCaseLower")}</SelectItem>
              <SelectItem value="upper">{t("ui.brCaseUpper")}</SelectItem>
              <SelectItem value="title">{t("ui.brCaseTitle")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="br-seq" checked={addSequence} onCheckedChange={setAddSequence} />
          <Label htmlFor="br-seq">{t("ui.brSequence")}</Label>
          {addSequence ? (
            <Input
              dir="ltr"
              type="number"
              min={1}
              max={6}
              value={seqDigits}
              onChange={(event) => setSeqDigits(Math.min(6, Math.max(1, Number(event.target.value))))}
              className="w-20"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="br-output">{t("ui.brPreview")}</Label>
        <ul id="br-output" className="flex flex-col gap-1 overflow-y-auto rounded-lg border border-border-subtle bg-surface p-3 font-mono text-sm">
          {list.map((original, index) => (
            <li key={index} dir="ltr" className="flex items-center gap-2 truncate">
              <span className="truncate text-text-muted line-through">{original}</span>
              <span aria-hidden="true" className="shrink-0 text-text-disabled">→</span>
              <span className="truncate font-medium">{renamed[index]}</span>
            </li>
          ))}
        </ul>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(renamed.join("\n"));
              toast(t("ui.fnCopied"));
            }}
          >
            {t("ui.brCopyAll")}
          </Button>
        </div>
      </div>
    </div>
  );
}
