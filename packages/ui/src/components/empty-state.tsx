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
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed",
        "border-border px-6 py-14 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="flex size-14 items-center justify-center rounded-full bg-accent-subtle text-accent-subtle-fg">
          <Icon icon={icon} size={24} />
        </div>
      ) : null}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-base font-semibold text-text">{title}</p>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
