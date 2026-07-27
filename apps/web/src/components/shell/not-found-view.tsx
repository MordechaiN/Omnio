import { useTranslations } from "next-intl";
import { Button } from "@omnio/ui";
import { Link } from "@/i18n/navigation";

/**
 * What someone sees at an address that doesn't exist.
 *
 * Lives in one component because two routes need it: the catch-all that
 * unmatched addresses fall into, and `not-found.tsx` for explicit `notFound()`
 * calls. Two copies would drift, and this is the screen you least want to be
 * wrong — it is already someone's bad moment.
 */
export function NotFoundView() {
  const t = useTranslations("errors.notFound");
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <p className="text-sm font-medium text-text-muted">{t("label")}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-text-muted">{t("body")}</p>
      <Button asChild className="mt-2">
        <Link href="/">{t("action")}</Link>
      </Button>
    </div>
  );
}
