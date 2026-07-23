"use client";

import { repairArgs } from "../../shared/qpdf-args.ts";
import { QpdfRewriteTool } from "../lib/qpdf-rewrite-tool.tsx";

/** Repair a damaged PDF by rewriting a clean, normalized copy, on your device. */
export default function PdfRepairTool() {
  return <QpdfRewriteTool buildArgs={repairArgs} suffix="repaired" keyPrefix="repair" />;
}
