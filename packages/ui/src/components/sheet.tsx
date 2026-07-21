"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { DialogOverlay } from "./dialog.tsx";
import { Icon } from "./icon.tsx";

/**
 * Sheet (drawer). Sides are LOGICAL: "start" is left in LTR and right in RTL.
 * Slide animations live in styles/components.css because keyframe directions
 * must flip with the document direction.
 */

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export interface SheetContentProps extends DialogPrimitive.DialogContentProps {
  side?: "start" | "end" | "bottom";
  closeLabel?: string;
}

const SIDE_CLASSES: Record<NonNullable<SheetContentProps["side"]>, string> = {
  start: "inset-y-0 start-0 h-full w-80 max-w-[85vw] border-e",
  end: "inset-y-0 end-0 h-full w-80 max-w-[85vw] border-s",
  bottom: "inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-2xl border-t",
};

export function SheetContent({
  className,
  children,
  side = "start",
  closeLabel = "Close",
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-omnio-sheet={side}
        className={cn(
          "fixed z-(--z-modal) flex flex-col bg-surface p-5 shadow-2",
          "border-border-subtle",
          SIDE_CLASSES[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className={cn(
            "absolute end-4 top-4 rounded-sm p-1 text-text-muted",
            "transition-colors duration-(--motion-fast) hover:bg-surface-raised hover:text-text",
          )}
        >
          <Icon icon={X} size={16} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
