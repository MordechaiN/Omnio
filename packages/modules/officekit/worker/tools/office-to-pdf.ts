import { access } from "node:fs/promises";
import { join } from "node:path";
import type { ToolJob, ToolResult, WorkerContext, WorkerTool } from "@omnio/module-sdk";
import { pdfName, sofficeArgs } from "../../shared/office.js";

type OfficeToPdfOptions = Record<string, never>;

/**
 * Server-tier Office → PDF. Heavyweight native conversion (LibreOffice) that
 * would be an enormous browser download, so it runs on the Omnio deployment
 * instead: the browser uploads the document, the worker converts it with a
 * sandboxed headless `soffice`, and streams the PDF back. Files never leave the
 * user's own Omnio — no third-party service, no cloud.
 */
const officeToPdfTool: WorkerTool<OfficeToPdfOptions> = {
  async process(job: ToolJob<OfficeToPdfOptions>, ctx: WorkerContext): Promise<ToolResult> {
    const input = job.inputs[0];
    if (!input) throw new Error("Office to PDF requires exactly one input file.");

    ctx.onProgress(10);
    const result = await ctx.exec("soffice", sofficeArgs(ctx.scratchDir, input.path), {
      // LibreOffice cold-starts a profile on first run; give it headroom.
      timeoutSec: 180,
    });
    ctx.onProgress(80);

    // soffice writes <basename-without-ext>.pdf into the outdir and reports its
    // own errors on stdout, exiting 0 even on some failures — so verify the file.
    const producedName = pdfName(input.originalName);
    const outputPath = join(ctx.scratchDir, producedName);
    try {
      await access(outputPath);
    } catch {
      const detail = new TextDecoder().decode(result.stderr).trim() || new TextDecoder().decode(result.stdout).trim();
      throw new Error(`LibreOffice could not convert this file${detail ? `: ${detail}` : "."}`);
    }
    ctx.onProgress(95);

    return {
      outputs: [{ path: outputPath, mime: "application/pdf", filename: producedName }],
    };
  },
};

export default officeToPdfTool;
