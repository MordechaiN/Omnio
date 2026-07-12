"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { Icon } from "./icon.tsx";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: AccordionPrimitive.AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      className={cn("border-b border-border-subtle last:border-b-0", className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "flex flex-1 items-center justify-between gap-3 py-4 text-start text-sm font-medium",
          "transition-colors duration-(--motion-fast) hover:text-accent",
          "[&[data-state=open]_svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <Icon
          icon={ChevronDown}
          size={16}
          className="text-text-muted transition-transform duration-(--motion-base) ease-(--ease-out)"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionContentProps) {
  return (
    <AccordionPrimitive.Content data-omnio-accordion-content className="overflow-hidden" {...props}>
      <div className={cn("pb-4 text-sm text-text-secondary", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
