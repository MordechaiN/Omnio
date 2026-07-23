"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { exportPreferences, importPreferences } from "@/lib/backup";
import { locales, localeNames, type Locale } from "@omnio/i18n";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  useAccent,
  useContrast,
  useDensity,
  useStyle,
  useTheme,
  toast,
  type AccentColor,
  type Density,
  type VisualStyle,
} from "@omnio/ui";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAutoOpenActivity, setAutoOpenActivity } from "@/lib/behavior-prefs";
import { useVersion } from "@/lib/use-version";
import { useUpdateCheck } from "@/lib/use-update-check";
import { buildInfo } from "@/lib/build-info";

const STYLES: VisualStyle[] = ["classic", "modern", "minimal", "accessible"];
const ACCENTS: AccentColor[] = ["indigo", "blue", "purple", "green", "orange"];
const DENSITIES: Density[] = ["compact", "comfortable", "large"];
const ACCENT_SWATCH: Record<AccentColor, string> = {
  indigo: "oklch(0.55 0.15 275)",
  blue: "oklch(0.55 0.15 255)",
  purple: "oklch(0.55 0.15 300)",
  green: "oklch(0.55 0.15 165)",
  orange: "oklch(0.55 0.15 55)",
};

function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      <div className="w-full shrink-0 sm:w-48">{children}</div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="divide-y divide-border-subtle">{children}</CardContent>
    </Card>
  );
}

export function SettingsPanel() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const { contrast, setContrast } = useContrast();
  const { style, setStyle } = useStyle();
  const { accent, setAccent } = useAccent();
  const { density, setDensity } = useDensity();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const autoOpenActivity = useAutoOpenActivity();
  const version = useVersion();
  const update = useUpdateCheck();
  const importInputRef = useRef<HTMLInputElement>(null);

  const displayVersion = version.data?.version ?? buildInfo.version;
  const displayBuild = version.data?.buildNumber ?? buildInfo.buildNumber;
  const displayCommit = version.data?.commit ?? buildInfo.commit;
  const releaseTimestamp = version.data?.buildTimestamp ?? buildInfo.buildDate;
  let releaseDate = releaseTimestamp;
  const parsedDate = new Date(releaseTimestamp);
  if (!Number.isNaN(parsedDate.getTime())) {
    releaseDate = parsedDate.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="animate-rise-stagger flex flex-col gap-8">
      <SettingsSection title={t("settings.general")}>
        <SettingRow label={t("settings.deploymentMode")} htmlFor="setting-mode-info">
          <div id="setting-mode-info" className="flex sm:justify-end">
            <Badge variant="neutral">
              {version.data
                ? t(version.data.mode === "personal" ? "about.modePersonal" : "about.modeMulti")
                : "—"}
            </Badge>
          </div>
        </SettingRow>
        <SettingRow label={t("settings.systemInfo")} htmlFor="setting-about-link">
          <div className="sm:flex sm:justify-end">
            <Button asChild variant="secondary" size="sm">
              <Link href="/about">{t("nav.about")}</Link>
            </Button>
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t("settings.version")}>
        <SettingRow label={t("settings.version")} htmlFor="setting-version">
          <div id="setting-version" className="flex sm:justify-end">
            <Badge variant="neutral">v{displayVersion}</Badge>
          </div>
        </SettingRow>
        <SettingRow label={t("settings.releaseDate")} htmlFor="setting-reldate">
          <div id="setting-reldate" className="text-sm text-text-muted sm:text-end">{releaseDate}</div>
        </SettingRow>
        <SettingRow label={t("settings.buildNumber")} htmlFor="setting-build">
          <div id="setting-build" className="text-sm text-text-muted sm:text-end">#{displayBuild}</div>
        </SettingRow>
        <SettingRow label={t("settings.commit")} htmlFor="setting-commit">
          <code id="setting-commit" dir="ltr" className="font-mono text-sm text-text-muted sm:block sm:text-end">{displayCommit}</code>
        </SettingRow>
        <SettingRow label={t("settings.checkUpdates")} htmlFor="setting-update">
          <div className="flex flex-col gap-1.5 sm:items-end">
            <Button
              id="setting-update"
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void update.check()}
              disabled={update.status === "checking"}
            >
              {update.status === "checking" ? t("settings.checking") : t("settings.checkUpdates")}
            </Button>
            {update.status === "latest" ? (
              <span aria-live="polite" className="text-sm text-text-muted">{t("settings.upToDate")}</span>
            ) : null}
            {update.status === "available" ? (
              <span aria-live="polite" className="text-sm text-accent">{t("settings.updateAvailable", { version: update.latest ?? "" })}</span>
            ) : null}
            {update.status === "error" ? (
              <span role="alert" className="text-sm text-danger">{t("settings.checkFailed")}</span>
            ) : null}
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title={t("settings.appearance")}
        description={t("settings.appearanceDescription")}
      >
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

        <SettingRow
          label={t("settings.style")}
          description={mounted ? t(`theme.styleDescription.${style}`) : undefined}
          htmlFor="setting-style"
        >
          {mounted ? (
            <Select value={style} onValueChange={(next) => setStyle(next as VisualStyle)}>
              <SelectTrigger id="setting-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`theme.style.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </SettingRow>

        <SettingRow
          label={t("settings.density")}
          description={mounted ? t(`theme.densityDescription.${density}`) : undefined}
          htmlFor="setting-density"
        >
          {mounted ? (
            <Select value={density} onValueChange={(next) => setDensity(next as Density)}>
              <SelectTrigger id="setting-density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DENSITIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {t(`theme.density.${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </SettingRow>

        <SettingRow label={t("settings.accentColor")} htmlFor="setting-accent">
          {mounted ? (
            <div
              id="setting-accent"
              role="radiogroup"
              aria-label={t("settings.accentColor")}
              className="flex flex-wrap gap-2 sm:justify-end"
              onKeyDown={(event) => {
                // WAI-ARIA radiogroup: arrows move both focus and selection,
                // following reading direction rather than physical left/right.
                const forward = event.key === (document.dir === "rtl" ? "ArrowLeft" : "ArrowRight");
                const backward = event.key === (document.dir === "rtl" ? "ArrowRight" : "ArrowLeft");
                if (!forward && !backward) return;
                event.preventDefault();
                const index = ACCENTS.indexOf(accent);
                const nextIndex = forward
                  ? (index + 1) % ACCENTS.length
                  : (index - 1 + ACCENTS.length) % ACCENTS.length;
                const next = ACCENTS[nextIndex]!;
                setAccent(next);
                (event.currentTarget.querySelector(`[data-accent="${next}"]`) as HTMLElement | null)?.focus();
              }}
            >
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  data-accent={a}
                  type="button"
                  role="radio"
                  aria-checked={accent === a}
                  aria-label={t(`theme.accent.${a}`)}
                  title={t(`theme.accent.${a}`)}
                  tabIndex={accent === a ? 0 : -1}
                  onClick={() => setAccent(a)}
                  className="flex size-8 items-center justify-center rounded-full border-2 transition-[border-color,transform] duration-(--motion-fast) ease-(--ease-out) hover:scale-105"
                  style={{
                    backgroundColor: ACCENT_SWATCH[a],
                    borderColor: accent === a ? "var(--text)" : "transparent",
                  }}
                >
                  {accent === a ? <span className="sr-only">{t("settings.selected")}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title={t("settings.accessibility")}
        description={t("settings.accessibilityDescription")}
      >
        <SettingRow label={t("theme.highContrast")} htmlFor="setting-contrast">
          <div className="flex sm:justify-end">
            <Switch
              id="setting-contrast"
              checked={contrast === "high"}
              onCheckedChange={(checked) => setContrast(checked ? "high" : "normal")}
            />
          </div>
        </SettingRow>
        <SettingRow
          label={t("settings.accessibleStyle")}
          description={t("settings.accessibleStyleDescription")}
          htmlFor="setting-accessible-shortcut"
        >
          <div className="sm:flex sm:justify-end">
            <Button
              id="setting-accessible-shortcut"
              variant="secondary"
              size="sm"
              disabled={style === "accessible"}
              onClick={() => setStyle("accessible")}
            >
              {style === "accessible" ? t("settings.accessibleStyleActive") : t("settings.accessibleStyleApply")}
            </Button>
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t("locale.label")}>
        <SettingRow label={t("settings.language")} htmlFor="setting-language">
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
      </SettingsSection>

      <SettingsSection
        title={t("settings.backup")}
        description={t("settings.backupDescription")}
      >
        <SettingRow label={t("settings.backupExport")} htmlFor="setting-backup-export">
          <div className="sm:flex sm:justify-end">
            <Button
              id="setting-backup-export"
              variant="secondary"
              size="sm"
              onClick={() => exportPreferences()}
            >
              {t("settings.backupExportAction")}
            </Button>
          </div>
        </SettingRow>
        <SettingRow
          label={t("settings.backupImport")}
          description={t("settings.backupImportDescription")}
          htmlFor="setting-backup-import"
        >
          <div className="sm:flex sm:justify-end">
            <Button
              id="setting-backup-import"
              variant="secondary"
              size="sm"
              onClick={() => importInputRef.current?.click()}
            >
              {t("settings.backupImportAction")}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              aria-label={t("settings.backupImport")}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void importPreferences(file).then((ok) => {
                  toast(ok ? t("settings.backupImported") : t("settings.backupInvalid"));
                  if (ok) window.location.reload();
                });
              }}
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title={t("settings.behavior")}>
        <SettingRow
          label={t("settings.autoOpenActivity")}
          description={t("settings.autoOpenActivityDescription")}
          htmlFor="setting-auto-open-activity"
        >
          <div className="flex sm:justify-end">
            <Switch
              id="setting-auto-open-activity"
              checked={autoOpenActivity}
              onCheckedChange={setAutoOpenActivity}
            />
          </div>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
