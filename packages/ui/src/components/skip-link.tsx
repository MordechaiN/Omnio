import { cn } from "../lib/cn.ts";

/**
 * First focusable element on every page: invisible until focused,
 * jumps keyboard users straight past the chrome.
 */
export function SkipLink({
  className,
  href = "#main",
  children,
  ...props
}: React.ComponentProps<"a">) {
  return (
    <a
      href={href}
      className={cn(
        "fixed start-4 top-4 z-(--z-toast) -translate-y-20 rounded-sm bg-accent px-3 py-2",
        "text-sm font-medium text-accent-fg transition-transform duration-(--motion-base)",
        "focus-visible:translate-y-0",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
