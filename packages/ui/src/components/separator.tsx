import { cn } from "../lib/cn.ts";

export interface SeparatorProps extends React.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical";
  /** Purely visual separators should stay hidden from the tree. */
  decorative?: boolean;
}

export function Separator({
  orientation = "horizontal",
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border-subtle",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}
