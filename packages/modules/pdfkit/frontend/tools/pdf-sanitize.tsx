"use client";

import { sanitizeArgs } from "../../shared/qpdf-args.ts";
import { QpdfRewriteTool } from "../lib/qpdf-rewrite-tool.tsx";

/** Sanitize a PDF — strip unreferenced content and rebuild, on your device. */
export default function PdfSanitizeTool() {
  return <QpdfRewriteTool buildArgs={sanitizeArgs} suffix="sanitized" keyPrefix="sanitize" />;
}
