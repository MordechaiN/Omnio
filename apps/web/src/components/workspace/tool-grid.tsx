import type { SearchEntry } from "@/generated/registry.search";
import { ToolCard } from "./tool-card";

/** The one tool grid, shared by the launcher, personal sections, and categories. */
export function ToolGrid({ entries }: { entries: SearchEntry[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map((entry) => (
        <li key={entry.id}>
          <ToolCard entry={entry} />
        </li>
      ))}
    </ul>
  );
}
