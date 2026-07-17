import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ToolJob, ToolResult, WorkerContext, WorkerTool } from "@omnio/module-sdk";
import { uppercaseText } from "../../shared/uppercase.js";

type UppercaseOptions = Record<string, never>;

/**
 * Worker-tier reference tool: reads the uploaded text file from the job scratch
 * dir, uppercases it, and writes the result back as a new output. Proves the
 * whole worker path (stage input → process → emit output) end to end.
 */
const uppercaseTool: WorkerTool<UppercaseOptions> = {
  async process(job: ToolJob<UppercaseOptions>, ctx: WorkerContext): Promise<ToolResult> {
    const input = job.inputs[0];
    if (!input) throw new Error("uppercase requires exactly one input file.");

    ctx.onProgress(10);
    const text = await readFile(input.path, "utf8");
    const outputPath = join(ctx.scratchDir, "uppercase.txt");
    await writeFile(outputPath, uppercaseText(text), "utf8");
    ctx.onProgress(90);

    return {
      outputs: [
        { path: outputPath, mime: "text/plain", filename: `uppercase-${input.originalName}` },
      ],
    };
  },
};

export default uppercaseTool;
