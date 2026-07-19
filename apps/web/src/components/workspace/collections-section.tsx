"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";
import {
  createCollection,
  deleteCollection,
  updateCollection,
  useCollections,
  type Collection,
} from "@/lib/preferences";
import { NameEmojiDialog } from "./collection-dialog";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

function CollectionRow({ collection }: { collection: Collection }) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const tools = collection.toolIds
    .map((id) => BY_ID.get(id))
    .filter((entry): entry is SearchEntry => entry !== undefined);

  return (
    <div
      id={`c-${collection.id}`}
      className="flex scroll-mt-24 flex-col gap-2.5 rounded-xl border border-border-subtle bg-surface p-4"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg leading-none">
          {collection.emoji}
        </span>
        <h3 className="flex-1 truncate text-sm font-semibold">{collection.name}</h3>
        <IconButton
          aria-label={t("collections.rename")}
          icon={Pencil}
          size="sm"
          variant="ghost"
          onClick={() => setEditing(true)}
        />
        <IconButton
          aria-label={t("collections.delete")}
          icon={Trash2}
          size="sm"
          variant="ghost"
          onClick={() => deleteCollection(collection.id)}
        />
      </div>
      {tools.length === 0 ? (
        <p className="text-sm text-text-muted">{t("collections.emptyCollection")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tools.map((entry) => {
            const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
            return (
              <li key={entry.id}>
                <Link
                  href={entry.href}
                  className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg px-2.5 py-1.5 text-sm transition-colors duration-(--motion-fast) hover:border-border hover:bg-surface-raised"
                >
                  <DynamicIcon name={entry.icon as IconName} size={14} className="text-text-muted" />
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {editing ? (
        <NameEmojiDialog
          open={editing}
          onOpenChange={setEditing}
          title={t("collections.renameTitle")}
          submitLabel={t("collections.save")}
          initialName={collection.name}
          initialEmoji={collection.emoji}
          onSubmit={(name, emoji) => updateCollection(collection.id, { name, emoji })}
        />
      ) : null}
    </div>
  );
}

/**
 * 🗂️ Collections — the user's own groupings of tools, entirely local. The
 * section always shows its create affordance so the feature stays
 * discoverable; rows link straight into tools.
 */
export function CollectionsSection() {
  const t = useTranslations();
  const collections = useCollections();
  const [creating, setCreating] = useState(false);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="collections-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="collections-title"
          className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
        >
          <span aria-hidden="true" className="text-base leading-none normal-case">
            🗂️
          </span>
          {t("collections.title")}
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-accent transition-colors duration-(--motion-fast) hover:bg-accent-subtle"
        >
          <Plus size={14} aria-hidden="true" />
          {t("collections.new")}
        </button>
      </div>

      {collections.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-muted">
          {t("collections.emptyHint")}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {collections.map((collection) => (
            <CollectionRow key={collection.id} collection={collection} />
          ))}
        </div>
      )}

      <NameEmojiDialog
        open={creating}
        onOpenChange={setCreating}
        title={t("collections.newTitle")}
        submitLabel={t("collections.create")}
        onSubmit={(name, emoji) => createCollection(name, emoji)}
      />
    </section>
  );
}
