"use client";

import * as RadioPrimitive from "@radix-ui/react-radio-group";
import { cn } from "../lib/cn.ts";

export function RadioGroup({ className, ...props }: RadioPrimitive.RadioGroupProps) {
  return <RadioPrimitive.Root className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: RadioPrimitive.RadioGroupItemProps) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-surface",
        "transition-colors duration-(--motion-fast) ease-(--ease-out)",
        "hover:border-border-strong",
        "data-[state=checked]:border-accent",
        "disabled:pointer-events-none disabled:opacity-55",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2 rounded-full bg-accent" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Item>
  );
}
