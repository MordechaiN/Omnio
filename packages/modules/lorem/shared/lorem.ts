/**
 * Lorem Ipsum generator — deterministic given a seed so previews are stable,
 * on-device. Produces words, sentences or paragraphs from the classic corpus.
 */

const WORDS =
  ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor " +
    "incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud " +
    "exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure " +
    "in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint " +
    "occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum")
    .split(" ");

export type LoremUnit = "words" | "sentences" | "paragraphs";

/** Small deterministic PRNG (mulberry32) for stable output. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng: () => number): string {
  return WORDS[Math.floor(rng() * WORDS.length)]!;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function sentence(rng: () => number): string {
  const length = 8 + Math.floor(rng() * 8);
  const words = Array.from({ length }, () => pick(rng));
  return `${capitalize(words.join(" "))}.`;
}

export function generateLorem(unit: LoremUnit, count: number, seed = 1): string {
  const rng = makeRng(seed);
  const n = Math.max(1, Math.min(count, 200));
  if (unit === "words") {
    return Array.from({ length: n }, () => pick(rng)).join(" ");
  }
  if (unit === "sentences") {
    return Array.from({ length: n }, () => sentence(rng)).join(" ");
  }
  return Array.from({ length: n }, () => {
    const sentences = 3 + Math.floor(rng() * 3);
    return Array.from({ length: sentences }, () => sentence(rng)).join(" ");
  }).join("\n\n");
}
