"use client";

import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { Icon } from "./icon.tsx";

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export const DropdownMenuSub = MenuPrimitive.Sub;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

const contentClasses = cn(
  "z-(--z-dropdown) min-w-44 overflow-hidden rounded-lg border border-border-subtle",
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

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: MenuPrimitive.DropdownMenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(contentClasses, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: MenuPrimitive.DropdownMenuItemProps) {
  return <MenuPrimitive.Item className={cn(itemClasses, className)} {...props} />;
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.DropdownMenuCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(itemClasses, "ps-7", className)} {...props}>
      <span className="absolute start-2 flex items-center">
        <MenuPrimitive.ItemIndicator>
          <Icon icon={Check} size={16} />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.DropdownMenuRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemClasses, "relative ps-7", className)} {...props}>
      <span className="absolute start-2 flex items-center">
        <MenuPrimitive.ItemIndicator>
          <Circle size={7} fill="currentColor" aria-hidden />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: MenuPrimitive.DropdownMenuLabelProps) {
  return (
    <MenuPrimitive.Label
      className={cn("px-2 py-1.5 text-xs font-medium text-text-muted", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.DropdownMenuSeparatorProps) {
  return (
    <MenuPrimitive.Separator
      className={cn("mx-1 my-1 h-px bg-border-subtle", className)}
      {...props}
    />
  );
}

/** Trailing hint (shortcut). Rendered at the logical end of an item. */
export function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("ms-auto text-xs text-text-muted", className)} {...props} />;
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.DropdownMenuSubTriggerProps) {
  return (
    <MenuPrimitive.SubTrigger className={cn(itemClasses, className)} {...props}>
      {children}
      <span className="ms-auto">
        <Icon icon={ChevronRight} size={16} />
      </span>
    </MenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: MenuPrimitive.DropdownMenuSubContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent className={cn(contentClasses, className)} {...props} />
    </MenuPrimitive.Portal>
  );
}
