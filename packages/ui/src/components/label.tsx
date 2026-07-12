import { cn } from "../lib/cn.ts";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium text-text select-none",
        "peer-disabled:pointer-events-none peer-disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
