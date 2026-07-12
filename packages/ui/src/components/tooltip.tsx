"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../lib/cn.ts";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: TooltipPrimitive.TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-(--z-tooltip) rounded-sm border border-border-subtle bg-surface-raised px-2 py-1",
          "text-xs text-text-secondary shadow-1 select-none",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-97",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
