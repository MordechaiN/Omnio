import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { Icon } from "./icon.tsx";

const alertVariants = cva("flex gap-3 rounded-lg border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-info/25 bg-info-subtle text-info-subtle-fg",
      success: "border-success/25 bg-success-subtle text-success-subtle-fg",
      warning: "border-warning/35 bg-warning-subtle text-warning-subtle-fg",
      danger: "border-danger/25 bg-danger-subtle text-danger-subtle-fg",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const VARIANT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
} as const;

export interface AlertProps
  extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {}

export function Alert({ className, variant = "info", children, ...props }: AlertProps) {
  return (
    <div
      role={variant === "danger" || variant === "warning" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon icon={VARIANT_ICON[variant ?? "info"]} size={16} className="mt-0.5" />
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-semibold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("[&_a]:underline [&_a]:underline-offset-2", className)} {...props} />;
}
