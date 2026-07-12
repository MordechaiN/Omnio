import { cn } from "../lib/cn.ts";

/** Loading placeholder. Size it with utility classes; screen readers skip it. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-sm bg-surface-raised", className)}
      {...props}
    />
  );
}
