import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  ListStart,
  ListEnd,
  LogIn,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Redo,
  Redo2,
  Reply,
  Send,
  SendHorizontal,
  Undo,
  Undo2,
} from "lucide-react";
import { cn } from "../lib/cn.ts";

/**
 * Icons whose meaning is directional ("forward", "back", "indent") and must
 * mirror in RTL. Media controls, checkmarks, arrows that mean compass
 * directions, etc. deliberately do NOT mirror. Authors never decide —
 * the wrapper knows (docs/architecture/05-design-system.md §3).
 */
const DIRECTIONAL: ReadonlySet<LucideIcon> = new Set([
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  ListStart,
  ListEnd,
  LogIn,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Redo,
  Redo2,
  Reply,
  Send,
  SendHorizontal,
  Undo,
  Undo2,
]);

export type IconSize = 16 | 20 | 24;

export interface IconProps extends Omit<React.ComponentProps<"svg">, "children"> {
  icon: LucideIcon;
  size?: IconSize;
  /** Decorative by default; pass a label only when the icon stands alone. */
  label?: string;
}

export function Icon({ icon: LucideComponent, size = 16, label, className, ...props }: IconProps) {
  return (
    <LucideComponent
      size={size}
      strokeWidth={1.75}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("shrink-0", DIRECTIONAL.has(LucideComponent) && "rtl:-scale-x-100", className)}
      {...props}
    />
  );
}
