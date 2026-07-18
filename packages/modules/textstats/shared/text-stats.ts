/**
 * Text statistics — on-device. Word/character counting is Unicode-aware
 * (Intl.Segmenter where available, with a regex fallback) so Hebrew and other
 * scripts count correctly. Reading time uses 200 wpm.
 */

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  lines: number;
  paragraphs: number;
  readingSeconds: number;
}

function countGraphemes(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let count = 0;
    for (const _ of segmenter.segment(text)) count += 1;
    return count;
  }
  return [...text].length;
}

export function analyzeText(text: string): TextStats {
  const words = text.trim() === "" ? 0 : (text.trim().match(/\S+/g)?.length ?? 0);
  const sentences = text.trim() === "" ? 0 : (text.match(/[^.!?…]+[.!?…]+/g)?.length ?? (text.trim() ? 1 : 0));
  const paragraphs =
    text.trim() === "" ? 0 : text.split(/\n{2,}/).filter((block) => block.trim() !== "").length;
  return {
    characters: countGraphemes(text),
    charactersNoSpaces: countGraphemes(text.replace(/\s/g, "")),
    words,
    sentences,
    lines: text === "" ? 0 : text.split(/\n/).length,
    paragraphs,
    readingSeconds: Math.round((words / 200) * 60),
  };
}
