"use client";

import { useTranslations } from "next-intl";
import { workspace, type WorkspaceCollection, type WorkspaceFile, type WorkspaceTag } from "@omnio/workspace";
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@omnio/ui";

/**
 * The actions available on a file, as a real context menu.
 *
 * Every action here is also reachable elsewhere (Inspector, keyboard); this is
 * the discoverable surface, not the only one. Actions that apply to a whole
 * selection say so, because acting on one file when several are selected is the
 * single most annoying thing a file manager can do.
 */
export function FileContextMenu({
  file,
  selectionCount,
  tags,
  collections,
  recommendations,
  onOpen,
  onOpenWith,
  onQuickLook,
  onRename,
  onDuplicate,
  onDelete,
}: {
  file: WorkspaceFile;
  selectionCount: number;
  tags: WorkspaceTag[];
  collections: WorkspaceCollection[];
  recommendations: Array<{ toolId: string; href: string; label: string }>;
  onOpen: () => void;
  onOpenWith: (href: string, toolId: string) => void;
  onQuickLook: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("files");
  const many = selectionCount > 1;

  return (
    <ContextMenuContent>
      <ContextMenuItem onSelect={onOpen}>
        {t("open")}
        <ContextMenuShortcut>↵</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={onQuickLook}>
        {t("quickLook")}
        <ContextMenuShortcut>Space</ContextMenuShortcut>
      </ContextMenuItem>

      {recommendations.length > 0 ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger>{t("openWith")}</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {recommendations.map((rec) => (
              <ContextMenuItem key={rec.toolId} onSelect={() => onOpenWith(rec.href, rec.toolId)}>
                {rec.label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : null}

      <ContextMenuSeparator />

      <ContextMenuItem onSelect={onRename} disabled={many}>
        {t("rename")}
      </ContextMenuItem>
      <ContextMenuItem onSelect={onDuplicate}>{t("duplicate")}</ContextMenuItem>
      <ContextMenuItem onSelect={() => void workspace.setPinned(file.id, !file.pinned)} disabled={many}>
        {file.pinned ? t("unpin") : t("pin")}
      </ContextMenuItem>

      {tags.length > 0 ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger>{t("tags")}</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {tags.map((tag) => (
              <ContextMenuCheckboxItem
                key={tag.id}
                checked={file.tagIds.includes(tag.id)}
                onCheckedChange={() => void workspace.toggleTag(file.id, tag.id)}
              >
                {tag.name}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : null}

      {collections.length > 0 ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger>{t("moveToCollection")}</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuLabel>{t("collections")}</ContextMenuLabel>
            {collections.map((collection) => (
              <ContextMenuCheckboxItem
                key={collection.id}
                checked={file.collectionIds.includes(collection.id)}
                onCheckedChange={(on: boolean) => void workspace.setCollection(file.id, collection.id, on)}
              >
                {collection.name}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : null}

      <ContextMenuSeparator />

      <ContextMenuItem onSelect={onDelete}>
        {many ? t("deleteMany", { count: selectionCount }) : t("delete")}
        <ContextMenuShortcut>⌫</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
