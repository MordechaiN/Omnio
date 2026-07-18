"use client";

import { cn } from "../lib/cn.ts";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Leading adornment (icon, prefix) — rendered inside the field, logical start. */
  startAdornment?: React.ReactNode;
  /** Trailing adornment (shortcut hint, clear button) — logical end. */
  endAdornment?: React.ReactNode;
}

const fieldClasses = cn(
  "h-(--control-h-md) w-full min-w-0 rounded-sm border border-border bg-surface px-2.5 text-sm text-text",
  "placeholder:text-text-muted",
  "transition-[border-color,box-shadow] duration-(--motion-fast) ease-(--ease-out)",
  "hover:border-border-strong",
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/25",
  "disabled:pointer-events-none disabled:opacity-55",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/25",
);

export function Input({ className, startAdornment, endAdornment, ...props }: InputProps) {
  if (!startAdornment && !endAdornment) {
    return <input className={cn(fieldClasses, className)} {...props} />;
  }
  return (
    <div className="relative flex w-full items-center">
      {startAdornment ? (
        <span className="pointer-events-none absolute start-2.5 flex items-center text-text-muted">
          {startAdornment}
        </span>
      ) : null}
      <input
        className={cn(fieldClasses, startAdornment && "ps-8", endAdornment && "pe-8", className)}
        {...props}
      />
      {endAdornment ? (
        <span className="absolute end-2.5 flex items-center text-text-muted">{endAdornment}</span>
      ) : null}
    </div>
  );
}
