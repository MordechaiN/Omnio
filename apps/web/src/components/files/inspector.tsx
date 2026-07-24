"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ExternalLink, Pin, PinOff, Trash2 } from "lucide-react";

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
  onOpenWith: (href: string) => void;
  onSelectFile: (id: string) => void;
  onDelete: (id: string) => void;
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

  useEffect(() => {
    setRenaming(false);
  }, [file?.id]);

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
      <aside className="flex h-full w-80 shrink-0 flex-col items-center justify-center border-s border-border-subtle p-6 text-center" aria-label={t("inspector")}>
        <p className="text-sm text-text-muted">{t("inspectorEmpty")}</p>
      </aside>
    );
  }

  const facts = file.facts;

  return (
    <aside
      className="flex h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto border-s border-border-subtle p-4"
      aria-label={t("inspector")}
    >
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-surface-subtle">
        {preview ? (
          <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
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

      <div className="flex flex-wrap gap-1.5">
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

      <Section title={t("metadata")}>
        <Row label={t("kindLabel")} value={tKind(kindOf(file.mime) as "other")} />
        <Row label={t("size")} value={formatBytes(file.size)} />
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

      {collections.length > 0 ? (
        <Section title={t("collections")}>
          <div className="flex flex-wrap gap-1.5">
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
        </Section>
      ) : null}

      {relations.parent || relations.children.length > 0 || relations.siblings.length > 0 ? (
        <Section title={t("relations")}>
          {relations.ancestry.length > 0 ? (
            <div className="mb-2">
              <p className="mb-1 text-xs text-text-muted">{t("origin")}</p>
              <ol className="flex flex-col gap-0.5">
                {relations.ancestry.map((ancestor) => (
                  <li key={ancestor.id}>
                    <RelationLink file={ancestor} onSelect={onSelectFile} />
                  </li>
                ))}
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

      {recommendations.length > 0 ? (
        <Section title={t("openWith")}>
          <div className="flex flex-col gap-1">
            {recommendations.map((rec) => (
              <Button
                key={rec.toolId}
                size="sm"
                variant="ghost"
                className="justify-start"
                onClick={() => onOpenWith(rec.href)}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
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
