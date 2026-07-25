"use client";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn.ts";

/**
 * Native-feeling context menu.
 *
 * Built on the primitive rather than a dropdown positioned at the pointer,
 * because the behaviours that make a context menu feel native are exactly the
 * ones a positioned dropdown lacks: right-click anywhere on the trigger,
 * long-press on touch, the keyboard Menu key, edge collision handling, and
 * focus returning to where it came from on close.
 */

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const contentClasses = cn(
  "z-(--z-dropdown) min-w-48 overflow-hidden rounded-lg border border-border-subtle",
  "bg-overlay p-1 shadow-2",
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
);

const itemClasses = cn(
  "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text select-none",
  "outline-none transition-colors duration-(--motion-fast)",
  "data-highlighted:bg-surface-raised",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-55",
);

export function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content className={cn(contentClasses, className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(itemClasses, inset && "ps-8", className)}
      {...props}
    />
  );
}

export function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      className={cn(itemClasses, "ps-8", className)}
      checked={checked}
      {...props}
    >
      <span className="absolute start-2 flex h-3.5 w-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5" aria-hidden />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

export function ContextMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return (
    <ContextMenuPrimitive.Label
      className={cn("px-2 py-1.5 text-xs font-semibold text-text-muted", className)}
      {...props}
    />
  );
}

export function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border-subtle", className)}
      {...props}
    />
  );
}

export function ContextMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger className={cn(itemClasses, className)} {...props}>
      {children}
      <ChevronRight className="ms-auto h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
    </ContextMenuPrimitive.SubTrigger>
  );
}

export function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent className={cn(contentClasses, className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("ms-auto text-xs tracking-widest text-text-muted", className)} {...props} />
  );
}
