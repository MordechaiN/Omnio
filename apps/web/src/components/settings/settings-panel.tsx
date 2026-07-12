"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { locales, localeNames, type Locale } from "@omnio/i18n";
import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  useContrast,
  useTheme,
} from "@omnio/ui";
import { usePathname, useRouter } from "@/i18n/navigation";

function SettingRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="w-44">{children}</div>
    </div>
  );
}

export function SettingsPanel() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const { contrast, setContrast } = useContrast();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardContent className="divide-y divide-border-subtle">
        <SettingRow label={t("theme.label")} htmlFor="setting-theme">
          {mounted ? (
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="setting-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("theme.light")}</SelectItem>
                <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                <SelectItem value="system">{t("theme.system")}</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </SettingRow>

        <SettingRow label={t("theme.highContrast")} htmlFor="setting-contrast">
          <div className="flex justify-end">
            <Switch
              id="setting-contrast"
              checked={contrast === "high"}
              onCheckedChange={(checked) => setContrast(checked ? "high" : "normal")}
            />
          </div>
        </SettingRow>

        <SettingRow label={t("locale.label")} htmlFor="setting-language">
          <Select
            value={locale}
            onValueChange={(next) => router.replace(pathname, { locale: next as Locale })}
          >
            <SelectTrigger id="setting-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((code) => (
                <SelectItem key={code} value={code} lang={code}>
                  {localeNames[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </CardContent>
    </Card>
  );
}
