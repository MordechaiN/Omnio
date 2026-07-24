import { getTranslations } from "next-intl/server";
import { FilesWorkspace } from "@/components/files/files-workspace";

export async function generateMetadata() {
  const t = await getTranslations("files");
  return { title: t("title") };
}

export default async function FilesPage() {
  const t = await getTranslations("files");
  return (
    <div className="flex flex-col gap-2">
      <h1 className="px-3 pt-3 text-lg font-semibold">{t("title")}</h1>
      <FilesWorkspace />
    </div>
  );
}
