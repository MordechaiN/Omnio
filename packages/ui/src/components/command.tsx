"use client";

import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "../lib/cn.ts";
import { DialogOverlay } from "./dialog.tsx";
import { Icon } from "./icon.tsx";

/**
 * Command palette primitives (cmdk), styled for Omnio. The composed,
 * app-aware palette (with actions, navigation, i18n) lives in apps/web —
 * these are the visual building blocks.
 */

export function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn("flex w-full flex-col overflow-hidden text-text", className)}
      {...props}
    />
  );
}

export interface CommandDialogProps extends DialogPrimitive.DialogProps {
  /** Accessible dialog title (not visually rendered). */
  title: string;
  className?: string;
}

export function CommandDialog({ title, children, className, ...props }: CommandDialogProps) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-4 top-[14vh] z-(--z-modal) mx-auto max-w-xl",
            "overflow-hidden rounded-2xl border border-border-subtle bg-overlay shadow-2",
            "duration-(--motion-base) ease-(--ease-spring)",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97",
            className,
          )}
        >
          <VisuallyHidden>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden>
          {/* The cmdk root — Input/List children get their store from here. */}
          <Command>{children}</Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border-subtle px-4">
      <Icon icon={Search} size={16} className="text-text-muted" />
      <CommandPrimitive.Input
        className={cn(
          "h-12 w-full bg-transparent text-base text-text outline-none",
          "placeholder:text-text-muted",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      className={cn("max-h-[26rem] overflow-y-auto overscroll-contain p-2", className)}
      {...props}
    />
  );
}

export function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      className={cn("py-10 text-center text-sm text-text-muted", className)}
      {...props}
    />
  );
}

export function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
        "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        "[&_[cmdk-group-heading]]:text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm select-none",
        "text-text-secondary transition-colors duration-(--motion-fast) ease-(--ease-out)",
        "data-[selected=true]:bg-accent-subtle data-[selected=true]:text-accent-subtle-fg",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-55",
        className,
      )}
      {...props}
    />
  );
}

export function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      className={cn("mx-2 my-1.5 h-px bg-border-subtle", className)}
      {...props}
    />
  );
}

/** Trailing hint on an item — keyboard shortcut or category. */
export function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("ms-auto text-xs text-text-muted", className)} {...props} />;
}

/** Persistent keyboard-hint strip along the bottom of the palette. */
export function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-t border-border-subtle px-4 py-2.5 text-xs text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function CommandFooterHint({
  keys,
  label,
}: {
  keys: string[];
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {keys.map((key) => (
          <kbd
            key={key}
            className="flex h-5 min-w-5 items-center justify-center rounded border border-border-subtle bg-surface px-1 font-mono text-[11px] text-text-secondary"
          >
            {key}
          </kbd>
        ))}
      </span>
      {label}
    </span>
  );
}
