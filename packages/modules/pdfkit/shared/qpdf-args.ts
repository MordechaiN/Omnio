/**
 * qpdf argument builders for the structural tools — pure and unit-testable so
 * the tool components stay thin wrappers around `runQpdf`. Input path is always
 * second-to-last and output path last, matching qpdf's CLI grammar.
 */

/** Optimize for the web (fast web view / linearized layout). */
export function linearizeArgs(inPath: string, outPath: string): string[] {
  return ["--linearize", inPath, outPath];
}

/**
 * Rewrite a clean, normalized copy. qpdf always reconstructs the cross-reference
 * table when it reads, so re-emitting with regenerated object streams and
 * recompressed flate recovers many damaged-but-readable files.
 */
export function repairArgs(inPath: string, outPath: string): string[] {
  return ["--recompress-flate", "--object-streams=generate", inPath, outPath];
}

/**
 * Strip content that isn't referenced by the document and rebuild — removes
 * dangling objects/resources that can carry stale or risky payloads.
 */
export function sanitizeArgs(inPath: string, outPath: string): string[] {
  return ["--remove-unreferenced-resources=yes", "--object-streams=generate", inPath, outPath];
}
