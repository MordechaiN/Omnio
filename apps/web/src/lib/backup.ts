/**
 * Universal export/import — the personal layer (favorites, usage, collections,
 * workflows) as a portable JSON file. Validation is strict on shape but
 * forgiving on extras, so future fields survive a round-trip. Workspaces
 * (large binaries) export separately as ZIPs from their own rows.
 */

const PREFS_KEY = "omnio.preferences.v1";

export interface BackupEnvelope {
  kind: "omnio-backup";
  version: 1;
  exportedAt: string;
  preferences: unknown;
}

export function exportPreferences(): void {
  const raw = window.localStorage.getItem(PREFS_KEY);
  const envelope: BackupEnvelope = {
    kind: "omnio-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    preferences: raw ? (JSON.parse(raw) as unknown) : null,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `omnio-backup-${envelope.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Restore from a backup file. Resolves true on success; reload applies it. */
export async function importPreferences(file: File): Promise<boolean> {
  try {
    const parsed = JSON.parse(await file.text()) as Partial<BackupEnvelope>;
    if (parsed.kind !== "omnio-backup" || parsed.version !== 1) return false;
    if (parsed.preferences === null || parsed.preferences === undefined) return false;
    const prefs = parsed.preferences as Record<string, unknown>;
    if (typeof prefs.v !== "number") return false;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}
