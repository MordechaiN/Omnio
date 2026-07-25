"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  kindOf,
  workspace,
  type WorkspaceCollection,
  type WorkspaceEvent,
  type WorkspaceFile,
  type WorkspaceTag,
} from "@omnio/workspace";
import { useRelations, useThumbnail } from "@omnio/workspace/react";
import { Badge, Button, Input, Separator } from "@omnio/ui";
import { Check, Copy, CornerDownRight, ExternalLink, PanelRight, Pin, PinOff, Trash2 } from "lucide-react";

/**
 * The permanent Inspector panel.
 *
 * Everything here comes from the in-memory snapshot, so selecting a file
 * repaints instantly with no dialog, no fetch and no spinner. Only the preview
 * image is asynchronous, and it degrades to an icon rather than a placeholder
 * that shifts the layout.
 */

export interface InspectorProps {
  file: WorkspaceFile | null;
  selectionCount: number;
  tags: WorkspaceTag[];
  collections: WorkspaceCollection[];
  events: WorkspaceEvent[];
  recommendations: Array<{ toolId: string; href: string; label: string }>;
  /** toolId is required: it is what links the tool's output back to this file. */
  onOpenWith: (href: string, toolId: string) => void;
  onSelectFile: (id: string) => void;
  onDelete: (id: string) => void;
  /** Chain suggestions for this file, rendered by the workspace. */
  chainSlot?: React.ReactNode;
  /** Set by the context menu's Rename action; puts the name field into edit mode. */
  renameRequestId?: string | null;
  onRenameHandled?: () => void;
}

export function Inspector({
  file,
  selectionCount,
  tags,
  collections,
  events,
  recommendations,
  onOpenWith,
  onSelectFile,
  onDelete,
  chainSlot,
  renameRequestId,
  onRenameHandled,
}: InspectorProps) {
  const t = useTranslations("files");
  const tKind = useTranslations("files.kind");
  const tEvent = useTranslations("files.event");
  const format = useFormatter();
  const preview = useThumbnail(file);
  const relations = useRelations(file);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [copied, setCopied] = useState(false);
  const [newCollection, setNewCollection] = useState("");

  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setRenaming(false);
    // Selecting a different file must show its details from the top; carrying
    // the previous scroll position over looked like clipped content.
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [file?.id]);

  // Rename can be triggered from the context menu; the field lives here, so the
  // request is handed over rather than duplicating the editor in two places.
  useEffect(() => {
    if (!file || renameRequestId !== file.id) return;
    setDraftName(file.name);
    setRenaming(true);
    onRenameHandled?.();
  }, [renameRequestId, file, onRenameHandled]);

  const history = useMemo(
    () => events.filter((e) => e.fileId === file?.id).sort((a, b) => b.at - a.at),
    [events, file?.id],
  );

  if (selectionCount > 1) {
    return (
      <aside className="flex h-full w-80 shrink-0 flex-col border-s border-border-subtle p-4" aria-label={t("inspector")}>
        <p className="text-sm text-text-muted">{t("multiSelected", { count: selectionCount })}</p>
      </aside>
    );
  }

  if (!file) {
    return (
      <aside
        className="flex h-full w-80 shrink-0 flex-col items-center justify-center gap-3 border-s border-border-subtle p-6 text-center"
        aria-label={t("inspector")}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle">
          <PanelRight className="h-5 w-5 text-text-muted" aria-hidden />
        </span>
        <p className="text-sm font-medium">{t("inspectorEmptyTitle")}</p>
        <p className="text-xs text-text-muted">{t("inspectorEmpty")}</p>
      </aside>
    );
  }

  const facts = file.facts;

  return (
    <aside
      ref={panelRef}
      className="flex h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto border-s border-border-subtle p-4"
      aria-label={t("inspector")}
    >
      <div className="flex h-40 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-subtle p-2">
        {preview ? (
          // Border and shadow, because a white page on a white surface has no
          // edge and reads as floating content rather than a document.
          <img
            src={preview}
            alt=""
            className="max-h-full max-w-full rounded-sm border border-border-subtle object-contain shadow-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
          />
        ) : (
          <span className="text-xs text-text-muted">{t("noPreview")}</span>
        )}
      </div>

      {renaming ? (
        <Input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => {
            void workspace.rename(file.id, draftName);
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void workspace.rename(file.id, draftName);
              setRenaming(false);
            }
            if (e.key === "Escape") setRenaming(false);
          }}
          aria-label={t("rename")}
        />
      ) : (
        <button
          type="button"
          className="break-words text-start text-sm font-medium hover:underline"
          onClick={() => {
            setDraftName(file.name);
            setRenaming(true);
          }}
          title={t("rename")}
        >
          {file.name}
        </button>
      )}

      <div className="flex shrink-0 flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => void workspace.setPinned(file.id, !file.pinned)}>
          {file.pinned ? <PinOff className="me-1 h-3.5 w-3.5" /> : <Pin className="me-1 h-3.5 w-3.5" />}
          {file.pinned ? t("unpin") : t("pin")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(file.id)}>
          <Trash2 className="me-1 h-3.5 w-3.5" />
          {t("delete")}
        </Button>
      </div>

      <Separator />

      <Section
        title={t("metadata")}
        action={
          <button
            type="button"
            onClick={() => {
              // Plain text, because the point is pasting into a message or a
              // ticket — not re-importing structured data.
              const lines = [
                `${file.name}`,
                `${t("kindLabel")}: ${tKind(kindOf(file.mime) as "other")}`,
                `${t("sizeLabel")}: ${formatBytes(file.size)}`,
                `${t("created")}: ${new Date(file.createdAt).toISOString()}`,
              ];
              void navigator.clipboard?.writeText(lines.join("\n")).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text"
            aria-label={t("copyMetadata")}
          >
            {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
            {copied ? t("copied") : t("copyMetadata")}
          </button>
        }
      >
        <Row label={t("kindLabel")} value={tKind(kindOf(file.mime) as "other")} />
        <Row label={t("sizeLabel")} value={formatBytes(file.size)} />
        {facts?.kind === "image" ? <Row label={t("dimensions")} value={`${facts.width} × ${facts.height}`} /> : null}
        {facts?.kind === "pdf" ? <Row label={t("pages")} value={String(facts.pages)} /> : null}
        {facts?.kind === "audio" || facts?.kind === "video" ? (
          <Row label={t("duration")} value={formatDuration(facts.durationMs)} />
        ) : null}
        <Row label={t("created")} value={format.dateTime(new Date(file.createdAt), { dateStyle: "medium", timeStyle: "short" })} />
        <Row label={t("lastOpened")} value={format.dateTime(new Date(file.lastOpenedAt), { dateStyle: "medium", timeStyle: "short" })} />
      </Section>

      <Section title={t("tags")}>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 ? <p className="text-xs text-text-muted">{t("noTags")}</p> : null}
          {tags.map((tag) => {
            const on = file.tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={on}
                onClick={() => void workspace.toggleTag(file.id, tag.id)}
                className={`rounded-full border px-2 py-0.5 text-xs transition ${
                  on ? "border-transparent text-white" : "border-border text-text-muted"
                }`}
                style={on ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || newTag.trim() === "") return;
            // Create and apply in one keystroke — a separate "create tag" dialog
            // would be two extra clicks for something this small.
            void (async () => {
              const tag = await workspace.createTag(newTag, TAG_COLORS[tags.length % TAG_COLORS.length]!);
              await workspace.toggleTag(file.id, tag.id);
              setNewTag("");
            })();
          }}
          placeholder={t("newTagPlaceholder")}
          aria-label={t("newTagPlaceholder")}
          className="h-7 text-xs"
        />
      </Section>

      <Section title={t("collections")}>
          <div className="flex flex-wrap gap-1.5">
            {collections.length === 0 ? (
              <p className="text-xs text-text-muted">{t("noCollections")}</p>
            ) : null}
            {collections.map((collection) => {
              const on = file.collectionIds.includes(collection.id);
              return (
                <button
                  key={collection.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => void workspace.setCollection(file.id, collection.id, !on)}
                  className={`rounded border px-2 py-0.5 text-xs ${on ? "border-accent text-accent" : "border-border text-text-muted"}`}
                >
                  {collection.name}
                </button>
              );
            })}
          </div>
          <Input
            value={newCollection}
            onChange={(e) => setNewCollection(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || newCollection.trim() === "") return;
              void (async () => {
                const created = await workspace.createCollection(newCollection);
                await workspace.setCollection(file.id, created.id, true);
                setNewCollection("");
              })();
            }}
            placeholder={t("newCollectionPlaceholder")}
            aria-label={t("newCollectionPlaceholder")}
            className="h-7 text-xs"
          />
        </Section>

      {relations.parent || relations.children.length > 0 || relations.siblings.length > 0 ? (
        <Section title={t("relations")}>
          {relations.ancestry.length > 0 ? (
            <div className="mb-2">
              <p className="mb-1 text-xs text-text-muted">{t("origin")}</p>
              {/* Indented chain: the derivation is a path, and showing it as a
                  flat list loses the one thing that makes it meaningful. */}
              <ol className="flex flex-col gap-0.5">
                {relations.ancestry.map((ancestor, depth) => (
                  <li key={ancestor.id} className="flex items-center gap-1" style={{ paddingInlineStart: depth * 10 }}>
                    {depth > 0 ? (
                      <CornerDownRight className="h-3 w-3 shrink-0 text-text-muted" aria-hidden />
                    ) : null}
                    <RelationLink file={ancestor} onSelect={onSelectFile} />
                  </li>
                ))}
                <li
                  className="flex items-center gap-1 text-xs text-text-muted"
                  style={{ paddingInlineStart: relations.ancestry.length * 10 }}
                >
                  <CornerDownRight className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate font-medium">{file.name}</span>
                </li>
              </ol>
            </div>
          ) : null}
          {relations.children.length > 0 ? (
            <div className="mb-2">
              <p className="mb-1 text-xs text-text-muted">{t("derived")}</p>
              <ul className="flex flex-col gap-0.5">
                {relations.children.map((child) => (
                  <li key={child.id}>
                    <RelationLink file={child} onSelect={onSelectFile} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {relations.siblings.length > 0 ? (
            <div>
              <p className="mb-1 text-xs text-text-muted">{t("siblings")}</p>
              <ul className="flex flex-col gap-0.5">
                {relations.siblings.map((sibling) => (
                  <li key={sibling.id}>
                    <RelationLink file={sibling} onSelect={onSelectFile} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      {chainSlot}

      {recommendations.length > 0 ? (
        <Section title={t("openWith")}>
          <div className="flex flex-col gap-1">
            {recommendations.map((rec) => (
              <Button
                key={rec.toolId}
                size="sm"
                variant="ghost"
                className="justify-start"
                onClick={() => onOpenWith(rec.href, rec.toolId)}
              >
                <ExternalLink className="me-1.5 h-3.5 w-3.5" />
                {rec.label}
              </Button>
            ))}
          </div>
        </Section>
      ) : null}

      <Section title={t("history")}>
        {history.length === 0 ? (
          <p className="text-xs text-text-muted">{t("noHistory")}</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {history.slice(0, 20).map((event) => (
              <li key={event.id} className="flex items-start gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span className="flex-1">
                  {tEvent(event.type as "imported")}
                  {event.toolId ? <Badge variant="neutral" className="ms-1.5">{event.toolId}</Badge> : null}
                  <span className="ms-1 text-text-muted">
                    {format.relativeTime(new Date(event.at), Date.now())}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </aside>
  );
}

/** A small, readable palette so tags are distinguishable without a colour picker. */
const TAG_COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-end">{value}</span>
    </div>
  );
}

function RelationLink({ file, onSelect }: { file: WorkspaceFile; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(file.id)}
      className="w-full truncate text-start text-xs text-accent hover:underline"
    >
      {file.name}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  return `${m}:${String(total - m * 60).padStart(2, "0")}`;
}
