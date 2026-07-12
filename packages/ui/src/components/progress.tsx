"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../lib/cn.ts";

export interface ProgressProps extends ProgressPrimitive.ProgressProps {
  /** Omit `value` (or pass null) for indeterminate. */
  value?: number | null;
}

export function Progress({ className, value, ...props }: ProgressProps) {
  const indeterminate = value == null;
  return (
    <ProgressPrimitive.Root
      value={indeterminate ? null : value}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-raised",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-omnio-progress={indeterminate ? "indeterminate" : "determinate"}
        className={cn(
          "h-full rounded-full bg-accent",
          // width-based fill starts at the logical inline-start in both directions
          !indeterminate && "transition-[width] duration-(--motion-slow) ease-(--ease-out)",
          indeterminate && "absolute w-1/3",
        )}
        style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
