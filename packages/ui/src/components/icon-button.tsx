"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { Icon, type IconSize } from "./icon.tsx";

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center select-none shrink-0",
    "rounded-sm",
    "transition-[background-color,border-color,color,scale] duration-(--motion-fast) ease-(--ease-out)",
    "active:scale-[0.96]",
    "disabled:pointer-events-none disabled:opacity-55",
  ],
  {
    variants: {
      variant: {
        ghost: "text-text-secondary hover:bg-surface-raised hover:text-text",
        secondary:
          "border border-border bg-surface text-text-secondary hover:text-text hover:border-border-strong",
        primary: "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active",
      },
      size: {
        sm: "size-(--control-h-sm)",
        md: "size-(--control-h-md)",
        lg: "size-(--control-h-lg)",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

const ICON_SIZE: Record<"sm" | "md" | "lg", IconSize> = { sm: 16, md: 16, lg: 20 };

export interface IconButtonProps
  extends
    Omit<React.ComponentProps<"button">, "children" | "aria-label">,
    VariantProps<typeof iconButtonVariants> {
  icon: LucideIcon;
  /** Required: an icon-only control must always name itself. */
  "aria-label": string;
}

export function IconButton({ className, variant, size, icon, ...props }: IconButtonProps) {
  return (
    <button className={cn(iconButtonVariants({ variant, size }), className)} {...props}>
      <Icon icon={icon} size={ICON_SIZE[size ?? "md"]} />
    </button>
  );
}
