"use client";

import { linearizeArgs } from "../../shared/qpdf-args.ts";
import { QpdfRewriteTool } from "../lib/qpdf-rewrite-tool.tsx";

/** Optimize a PDF for fast web view (linearize), on your device. */
export default function PdfLinearizeTool() {
  return <QpdfRewriteTool buildArgs={linearizeArgs} suffix="web" keyPrefix="lin" />;
}
