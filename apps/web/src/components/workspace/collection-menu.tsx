"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
} from "@omnio/ui";
import { FolderPlus, Plus } from "lucide-react";
import {
  createCollection,
  toggleToolInCollection,
  useCollections,
} from "@/lib/preferences";
import { NameEmojiDialog } from "./collection-dialog";

/**
 * "Add to collection" — a checkbox menu over the user's collections, plus an
 * inline path to create the first one. Lives in the tool page header.
 */
export function CollectionMenu({ toolId }: { toolId: string }) {
  const t = useTranslations("collections");
  const collections = useCollections();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton aria-label={t("addTo")} icon={FolderPlus} variant="ghost" size="sm" className="size-9" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel>{t("addTo")}</DropdownMenuLabel>
          {collections.map((collection) => (
            <DropdownMenuCheckboxItem
              key={collection.id}
              checked={collection.toolIds.includes(toolId)}
              onCheckedChange={() => toggleToolInCollection(collection.id, toolId)}
            >
              <span aria-hidden="true" className="me-1.5">
                {collection.emoji}
              </span>
              {collection.name}
            </DropdownMenuCheckboxItem>
          ))}
          {collections.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus size={14} aria-hidden="true" className="me-1.5" />
            {t("newEllipsis")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NameEmojiDialog
        open={creating}
        onOpenChange={setCreating}
        title={t("newTitle")}
        submitLabel={t("create")}
        onSubmit={(name, emoji) => {
          const id = createCollection(name, emoji);
          toggleToolInCollection(id, toolId);
        }}
      />
    </>
  );
}
