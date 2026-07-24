/**
 * Bookmark (outline) tree model for the TOC editor — pure data, no engine.
 *
 * A PDF outline is a tree, but it is far easier to edit as a flat list with an
 * indent level: that is how every real TOC editor presents it, and it makes
 * reordering a single array splice instead of a tree surgery. These functions
 * convert between the two and keep the flat form structurally valid, so the
 * MuPDF writer only ever receives a well-formed tree.
 */

export interface OutlineNode {
  title: string;
  /** Zero-based page index. */
  page: number;
  children: OutlineNode[];
}

export interface FlatBookmark {
  id: string;
  title: string;
  /** Zero-based page index. */
  page: number;
  /** 0 = top level. */
  depth: number;
}

/** Flatten a tree into the editable list form, depth-first. */
export function flattenOutline(nodes: OutlineNode[], depth = 0, idPrefix = "b"): FlatBookmark[] {
  const out: FlatBookmark[] = [];
  nodes.forEach((node, i) => {
    const id = `${idPrefix}${depth}_${i}`;
    out.push({ id, title: node.title, page: node.page, depth });
    out.push(...flattenOutline(node.children, depth + 1, `${id}_`));
  });
  return out;
}

/**
 * Clamp the depth sequence so it is representable as a tree: the first entry is
 * always top level, and no entry is more than one level deeper than the one
 * before it. Editing operations call this rather than trying to prevent every
 * invalid intermediate state.
 */
export function normalizeDepths(flat: FlatBookmark[]): FlatBookmark[] {
  let previous = -1;
  return flat.map((b) => {
    const depth = Math.max(0, Math.min(b.depth, previous + 1));
    previous = depth;
    return depth === b.depth ? b : { ...b, depth };
  });
}

/** Rebuild the tree from the flat list. Assumes depths are already normalized. */
export function buildOutlineTree(flat: FlatBookmark[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  for (const b of normalizeDepths(flat)) {
    const node: OutlineNode = { title: b.title, page: b.page, children: [] };
    stack.length = b.depth;
    const parent = stack[b.depth - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack[b.depth] = node;
  }
  return roots;
}

/**
 * Indent an entry one level, carrying its descendants with it. Illegal at the
 * top of the list or where it would skip a level, in which case the list is
 * returned untouched.
 */
export function indentAt(flat: FlatBookmark[], index: number): FlatBookmark[] {
  const item = flat[index];
  const prev = flat[index - 1];
  if (!item || !prev || item.depth > prev.depth) return flat;
  const end = subtreeEnd(flat, index);
  return flat.map((b, i) => (i >= index && i < end ? { ...b, depth: b.depth + 1 } : b));
}

/** Outdent an entry one level, carrying its descendants. No-op at top level. */
export function outdentAt(flat: FlatBookmark[], index: number): FlatBookmark[] {
  const item = flat[index];
  if (!item || item.depth === 0) return flat;
  const end = subtreeEnd(flat, index);
  return normalizeDepths(flat.map((b, i) => (i >= index && i < end ? { ...b, depth: b.depth - 1 } : b)));
}

/** Index one past the last descendant of the entry at `index`. */
export function subtreeEnd(flat: FlatBookmark[], index: number): number {
  const depth = flat[index]?.depth ?? 0;
  let end = index + 1;
  while (end < flat.length && flat[end]!.depth > depth) end += 1;
  return end;
}

/**
 * Move an entry (with its descendants) to another position in the list.
 * `to` is an index in the original array; the subtree is removed first, so a
 * move onto itself is a no-op.
 */
export function moveSubtree(flat: FlatBookmark[], index: number, to: number): FlatBookmark[] {
  const end = subtreeEnd(flat, index);
  if (to >= index && to < end) return flat;
  const subtree = flat.slice(index, end);
  const rest = [...flat.slice(0, index), ...flat.slice(end)];
  const insertAt = to > index ? to - subtree.length : to;
  return normalizeDepths([...rest.slice(0, insertAt), ...subtree, ...rest.slice(insertAt)]);
}

/** Drop entries that could not be written: blank titles or out-of-range pages. */
export function validBookmarks(flat: FlatBookmark[], pageCount: number): FlatBookmark[] {
  return normalizeDepths(
    flat.filter((b) => b.title.trim() !== "" && Number.isInteger(b.page) && b.page >= 0 && b.page < pageCount),
  );
}
