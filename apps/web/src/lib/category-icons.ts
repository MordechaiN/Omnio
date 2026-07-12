import type { CategoryId } from "@omnio/core";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  AudioLines,
  Calculator,
  Code2,
  FileSpreadsheet,
  FileText,
  Film,
  Globe,
  Image,
  ShieldCheck,
  Sparkles,
  Type,
  Wrench,
} from "lucide-react";

/** One icon per platform category. lucide only; rendered via the ui Icon wrapper. */
export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  images: Image,
  pdf: FileText,
  video: Film,
  audio: AudioLines,
  office: FileSpreadsheet,
  text: Type,
  developer: Code2,
  finance: Calculator,
  security: ShieldCheck,
  utilities: Wrench,
  ai: Sparkles,
  archives: Archive,
  networking: Globe,
};
