import type { ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export interface ToolShellProps {
  name: string;
  description: string;
  /** Pre-rendered tool icon (the route resolves the manifest icon name). */
  icon?: ReactNode;
  /** Trailing header slot — e.g. the "runs on your device" privacy badge. */
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The standard frame every tool surface renders inside — the reason 1,000 tools
 * stay consistent (docs/architecture/04-frontend.md §3). Owns header, layout,
 * and the privacy badge; the tool supplies the body. Richer contract (RHF+Zod
 * options panel, result actions, "send to…") grows in M5/M7.
 */
export function ToolShell({ name, description, icon, badge, children, className }: ToolShellProps) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6", className)}
    >
      <header className="flex items-start gap-3">
        {icon ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-subtle-fg">
            {icon}
          </span>
        ) : null}
        <div className="flex flex-1 flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{name}</h1>
          <p className="text-text-muted">{description}</p>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </header>
      <section className="flex flex-col gap-4">{children}</section>
    </div>
  );
}
