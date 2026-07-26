import type { ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export interface ToolShellProps {
  name: string;
  description: string;
  /** Pre-rendered tool icon (the route resolves the manifest icon name). */
  icon?: ReactNode;
  /** Trailing header slot — e.g. the "runs on your device" privacy badge. */
  badge?: ReactNode;
  /** Header action slot next to the badge — e.g. a favorite toggle. */
  actions?: ReactNode;
  /** Optional breadcrumb above the title (e.g. "Developer / JSON Format"). */
  breadcrumb?: ReactNode;
  /** Rendered after the tool body — e.g. related tools. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The standard frame every tool surface renders inside — the reason 1,000 tools
 * stay consistent (docs/architecture/04-frontend.md §3). Owns header, layout,
 * and the privacy badge; the tool supplies the body. Richer contract (RHF+Zod
 * options panel, result actions, "send to…") grows in M5/M7.
 */
export function ToolShell({
  name,
  description,
  icon,
  badge,
  actions,
  breadcrumb,
  footer,
  children,
  className,
}: ToolShellProps) {
  return (
    <div
      className={cn(
        "animate-rise mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        {breadcrumb ? <div className="text-sm text-text-muted">{breadcrumb}</div> : null}
        {/* Wraps rather than squeezes. On a narrow phone the icon, title,
            actions and the "runs on your device" badge cannot share one line,
            and that badge is the most important sentence on the page — the
            reason someone trusts Omnio with a contract or a passport scan. It
            drops to its own line instead of being truncated away. */}
        <header className="flex flex-wrap items-start gap-x-3 gap-y-2">
          {icon ? (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent-subtle-fg">
              {icon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-text">{name}</h1>
            <p className="text-text-muted">{description}</p>
          </div>
          <div className="flex shrink-0 basis-full items-center gap-2 sm:basis-auto">
            {actions}
            {badge}
          </div>
        </header>
      </div>
      <section className="flex flex-col gap-4">{children}</section>
      {footer}
    </div>
  );
}
