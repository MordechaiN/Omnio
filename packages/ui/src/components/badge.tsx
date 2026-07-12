import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-raised text-text-secondary border border-border-subtle",
        accent: "bg-accent-subtle text-accent-subtle-fg",
        success: "bg-success-subtle text-success-subtle-fg",
        warning: "bg-warning-subtle text-warning-subtle-fg",
        danger: "bg-danger-subtle text-danger-subtle-fg",
        info: "bg-info-subtle text-info-subtle-fg",
        outline: "border border-border text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
