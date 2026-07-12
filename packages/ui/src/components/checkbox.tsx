"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../lib/cn.ts";

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-xs border border-border bg-surface",
        "transition-colors duration-(--motion-fast) ease-(--ease-out)",
        "hover:border-border-strong",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-fg",
        "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-accent-fg",
        "disabled:pointer-events-none disabled:opacity-55",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {props.checked === "indeterminate" ? (
          <Minus size={12} strokeWidth={3} aria-hidden />
        ) : (
          <Check size={12} strokeWidth={3} aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
