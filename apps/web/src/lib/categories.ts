import { CATEGORY_IDS, type CategoryId } from "@omnio/core";
import { SEARCH_ENTRIES } from "@/generated/registry.search";

/**
 * Categories derived from the generated tool registry — the single source of
 * truth for what the navigation shows. A category with zero working tools is a
 * dead-end click, so it is hidden everywhere (home grid, sidebar, command
 * palette) and reappears automatically the moment a module ships a tool for
 * it. Its page stays URL-reachable with an honest empty state.
 */
const counts = new Map<CategoryId, number>();
for (const entry of SEARCH_ENTRIES) {
  const id = entry.category as CategoryId;
  counts.set(id, (counts.get(id) ?? 0) + 1);
}

export const TOOL_COUNT_BY_CATEGORY: ReadonlyMap<CategoryId, number> = counts;

export const ACTIVE_CATEGORY_IDS: readonly CategoryId[] = CATEGORY_IDS.filter((id) =>
  counts.has(id),
);
