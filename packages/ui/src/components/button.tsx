"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.ts";
import { Spinner } from "./spinner.tsx";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 select-none whitespace-nowrap",
    "rounded-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow,scale] duration-(--motion-fast) ease-(--ease-out)",
    "active:scale-[0.985]",
    "disabled:pointer-events-none disabled:opacity-55",
    "aria-busy:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "border border-border bg-surface text-text hover:bg-surface-raised hover:border-border-strong",
        ghost: "text-text-secondary hover:bg-surface-raised hover:text-text",
        danger: "bg-danger text-danger-fg hover:opacity-92",
      },
      // Heights read the density token (compact/comfortable/large) so every
      // button on the page resizes together from one Settings control.
      size: {
        sm: "h-(--control-h-sm) px-2.5 text-sm",
        md: "h-(--control-h-md) px-3 text-sm",
        lg: "h-(--control-h-lg) px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a link) while keeping button styling. */
  asChild?: boolean;
  /** Shows a spinner, announces busy state, and blocks interaction. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Spinner size={size === "lg" ? 16 : 14} />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
