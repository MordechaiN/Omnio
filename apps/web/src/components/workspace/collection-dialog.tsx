"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omnio/ui";
import { EMOJI_PRESETS } from "@/lib/emoji-presets";

/**
 * Name + emoji form shared by "new collection" and "new workflow" flows.
 * Controlled open state; calls onSubmit with the trimmed name and emoji.
 */
export function NameEmojiDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  initialName = "",
  initialEmoji = EMOJI_PRESETS[0],
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialEmoji?: string;
  onSubmit: (name: string, emoji: string) => void;
}) {
  const t = useTranslations("collections");
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);

  function submit() {
    const trimmed = name.trim();
    if (trimmed === "") return;
    onSubmit(trimmed, emoji);
    onOpenChange(false);
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ne-name">{t("nameLabel")}</Label>
            <Input
              id="ne-name"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("emojiLabel")}</Label>
            <div role="radiogroup" aria-label={t("emojiLabel")} className="flex flex-wrap gap-1.5">
              {EMOJI_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={emoji === preset}
                  aria-label={preset}
                  onClick={() => setEmoji(preset)}
                  className={`flex size-9 items-center justify-center rounded-md border text-lg transition-colors duration-(--motion-fast) ${
                    emoji === preset
                      ? "border-accent bg-accent-subtle"
                      : "border-border-subtle hover:border-border hover:bg-surface-raised"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={name.trim() === ""}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
