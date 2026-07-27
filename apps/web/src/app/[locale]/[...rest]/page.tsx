import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { use } from "react";
import { routing } from "@/i18n/routing";
import { NotFoundView } from "@/components/shell/not-found-view";

/**
 * Any address under a locale that matches no real page.
 *
 * This renders Omnio's own "not here" screen rather than delegating to
 * `notFound()`. Delegating produced a blank page: the not-found boundary
 * renders outside a matched route, where the request locale next-intl needs was
 * never established. A page renders inside one, so `setRequestLocale` works and
 * the screen appears in the reader's language and direction.
 *
 * The cost is an HTTP 200 where 404 would be more correct. For a person who
 * mistyped an address, a page that explains and offers a way back beats a status
 * code they will never see.
 */
export default function CatchAllNotFound({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <NotFoundView />;
}
