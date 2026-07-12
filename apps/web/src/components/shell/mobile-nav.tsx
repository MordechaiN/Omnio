"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconButton,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  VisuallyHidden,
} from "@omnio/ui";
import { Menu } from "lucide-react";
import { NavItems } from "./nav-items";

/** Hamburger + sheet — the sidebar's phone/tablet form. */
export function MobileNav() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton icon={Menu} aria-label={t("shell.openNavigation")} className="lg:hidden" />
      </SheetTrigger>
      <SheetContent side="start" closeLabel={t("common.close")} className="overflow-y-auto">
        <VisuallyHidden>
          <SheetTitle>{t("shell.primaryNavigation")}</SheetTitle>
        </VisuallyHidden>
        <div className="mt-8">
          <NavItems onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
