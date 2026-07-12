"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../lib/cn.ts";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-1 rounded-md bg-surface-raised p-0.5", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-sm px-3 text-sm font-medium",
        "text-text-muted transition-colors duration-(--motion-fast) ease-(--ease-out)",
        "hover:text-text",
        "data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-1",
        "disabled:pointer-events-none disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return <TabsPrimitive.Content className={cn("mt-3 outline-none", className)} {...props} />;
}
