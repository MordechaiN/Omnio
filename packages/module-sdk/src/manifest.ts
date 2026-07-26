import { z } from "zod";

/** Bump when the manifest shape changes incompatibly. */
export const MANIFEST_SCHEMA_VERSION = 1;

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export const ToolTierSchema = z.enum(["browser", "server", "worker"]);
export type ToolTier = z.infer<typeof ToolTierSchema>;

/** A file shape a tool accepts (drop-flow + input validation read this). */
export const AcceptSchema = z.object({
  mime: z.array(z.string().min(1)).min(1),
  multiple: z.boolean().optional(),
  maxSizeMB: z.number().positive().optional(),
  /** Smart-action ordering weight (0–100, higher first) for this file shape. */
  priority: z.number().int().min(0).max(100).optional(),
});

export const ProduceSchema = z.object({ mime: z.string().min(1) });

export const ToolLimitsSchema = z.object({
  timeoutSec: z.number().int().positive().optional(),
  memoryMB: z.number().int().positive().optional(),
  maxOutputMB: z.number().int().positive().optional(),
});

export const ToolManifestSchema = z
  .object({
    id: z.string().regex(KEBAB, "tool id must be kebab-case"),
    tier: ToolTierSchema,
    /** Mandatory above browser tier — the escalation rule, enforced by schema. */
    tierReason: z.string().min(1).optional(),
    surface: z.string().min(1),
    /**
     * The tool's own icon, falling back to the module's when absent.
     *
     * Every tool used to inherit its module's icon with no way to override, so
     * any list showing tools from one module — a dropped PDF offering PDF
     * tools, a category page, the palette — was a column of identical glyphs
     * that cost scanning time and gave nothing back.
     */
    icon: z.string().min(1).optional(),
    /**
     * Tools that already do this tool's whole job.
     *
     * Used only where Omnio proposes a shortlist for a file it was just handed.
     * A dropped PDF offered *Organize Pages* beside *Rotate*, *Delete* and
     * *Reorder Pages* — three things Organize does — so half the first screen
     * anyone ever sees was one job wearing four names.
     *
     * Deliberately not expressed by lowering `priority`: that is how well a tool
     * matches a file, and it also drives the Inspector, where "rotate this" is a
     * perfectly good thing to ask for directly. Overlap is a fact about tools,
     * not about how well they fit a PDF, so it gets its own field.
     */
    coveredBy: z.array(z.string()).optional(),
    accepts: z.array(AcceptSchema).optional(),
    produces: z.array(ProduceSchema).optional(),
    keywords: z.array(z.string()).optional(),
    limits: ToolLimitsSchema.optional(),
  })
  .superRefine((tool, ctx) => {
    if (tool.tier !== "browser" && !tool.tierReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tierReason"],
        message: `tierReason is required for '${tool.tier}'-tier tools (escalation rule).`,
      });
    }
  });
export type ToolManifest = z.infer<typeof ToolManifestSchema>;

export const FileActionSchema = z.object({
  toolId: z.string(),
  verb: z.string().min(1),
  rank: z.number().int(),
});
export type FileAction = z.infer<typeof FileActionSchema>;

export const ModuleManifestSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string().regex(KEBAB, "module id must be kebab-case"),
    version: z.string().regex(SEMVER, "version must be semver (e.g. 1.0.0)"),
    // Category membership is validated by modgen against @omnio/core so the
    // published schema stays free of the app-level category list.
    category: z.string().min(1),
    icon: z.string().min(1),
    i18nNamespace: z.string().min(1),
    tools: z.array(ToolManifestSchema).min(1),
    capabilities: z.object({ fileActions: z.array(FileActionSchema).optional() }).optional(),
    permissions: z.array(z.string()).default([]),
    worker: z
      .object({
        queues: z.array(z.string()).optional(),
        binaries: z.array(z.string()).optional(),
      })
      .optional(),
  })
  .superRefine((mod, ctx) => {
    if (mod.i18nNamespace !== `mod-${mod.id}`) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["i18nNamespace"],
        message: `i18nNamespace must be "mod-${mod.id}".`,
      });
    }
    const seen = new Set<string>();
    mod.tools.forEach((tool, index) => {
      if (seen.has(tool.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tools", index, "id"],
          message: `duplicate tool id "${tool.id}".`,
        });
      }
      seen.add(tool.id);
    });
    mod.capabilities?.fileActions?.forEach((action, index) => {
      if (!seen.has(action.toolId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["capabilities", "fileActions", index, "toolId"],
          message: `fileAction references unknown tool "${action.toolId}".`,
        });
      }
    });
  });
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;

export type ManifestParseResult = z.SafeParseReturnType<unknown, ModuleManifest>;

export function parseManifest(value: unknown): ManifestParseResult {
  return ModuleManifestSchema.safeParse(value);
}
