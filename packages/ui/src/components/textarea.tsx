"use client";

import { cn } from "../lib/cn.ts";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-sm border border-border bg-surface px-2.5 py-2 text-sm text-text",
        "placeholder:text-text-muted",
        "transition-[border-color,box-shadow] duration-(--motion-fast) ease-(--ease-out)",
        "hover:border-border-strong",
        "focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/25",
        "disabled:pointer-events-none disabled:opacity-55",
        "aria-invalid:border-danger aria-invalid:focus:ring-danger/25",
        className,
      )}
      {...props}
    />
  );
}
