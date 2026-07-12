import { cn } from "../lib/cn.ts";

export interface SpinnerProps extends React.ComponentProps<"svg"> {
  size?: number;
  /** Announced to screen readers when the spinner stands alone. */
  label?: string;
}

export function Spinner({ size = 16, label, className, ...props }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("animate-spin", className)}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2.5"
      />
      <path
        d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
