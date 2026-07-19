import type { CategoryId } from "@omnio/core";

/**
 * One emoji per category — the recognition anchor for browsing surfaces
 * (home grid, category page headers). Compact navigation (sidebar, command
 * palette) keeps monochrome icons instead; emoji there would double-code
 * every row. Always render these inside an aria-hidden wrapper: the emoji
 * accents the adjacent category name, it never replaces it.
 */
export const CATEGORY_EMOJI: Record<CategoryId, string> = {
  images: "🖼️",
  pdf: "📄",
  video: "🎬",
  audio: "🎵",
  office: "📊",
  text: "📝",
  developer: "💻",
  finance: "📈",
  security: "🔐",
  utilities: "🧰",
  ai: "✨",
  archives: "📦",
  networking: "🌐",
};
