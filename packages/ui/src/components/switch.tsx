"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../lib/cn.ts";

export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-5 w-8.5 shrink-0 items-center rounded-full p-0.5",
        "border border-transparent bg-border",
        "transition-colors duration-(--motion-base) ease-(--ease-out)",
        "data-[state=checked]:bg-accent",
        "disabled:pointer-events-none disabled:opacity-55",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block size-4 rounded-full bg-surface-raised shadow-1",
          "transition-transform duration-(--motion-base) ease-(--ease-out)",
          "data-[state=checked]:translate-x-3.5 data-[state=checked]:rtl:-translate-x-3.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
