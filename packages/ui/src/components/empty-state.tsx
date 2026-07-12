import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { Icon } from "./icon.tsx";

export interface EmptyStateProps extends React.ComponentProps<"div"> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Usually a Button — the one obvious next step. */
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed",
        "border-border px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="flex size-11 items-center justify-center rounded-lg bg-surface-raised text-text-muted">
          <Icon icon={icon} size={20} />
        </div>
      ) : null}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-semibold text-text">{title}</p>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
