import { cn } from "../lib/cn.ts";

/** A key cap, e.g. <Kbd>⌘</Kbd><Kbd>K</Kbd>. Font stays LTR even in RTL UIs. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      dir="ltr"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs px-1",
        "border border-border-subtle bg-surface text-[11px] font-medium text-text-muted",
        "shadow-[inset_0_-1px_0_var(--border-subtle)]",
        className,
      )}
      {...props}
    />
  );
}
