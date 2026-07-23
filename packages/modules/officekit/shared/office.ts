/**
 * Pure helpers for the server-side Office → PDF conversion — the argv and
 * filename logic, kept out of the worker so they're unit-testable without
 * spawning LibreOffice.
 */

/** The PDF filename a converted Office document should download as. */
export function pdfName(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "") || "document";
  return `${base}.pdf`;
}

/**
 * argv for a headless LibreOffice conversion to PDF. A per-job user-profile dir
 * (`-env:UserInstallation`) is required because the worker runs with a scrubbed
 * environment (no HOME), and keeps concurrent jobs from sharing profile state.
 */
export function sofficeArgs(scratchDir: string, inputPath: string): string[] {
  return [
    "--headless",
    "--nolockcheck",
    "--nodefault",
    `-env:UserInstallation=file://${scratchDir}/lo-profile`,
    "--convert-to",
    "pdf",
    "--outdir",
    scratchDir,
    inputPath,
  ];
}
