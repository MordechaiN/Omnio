/**
 * Workspace Actions — the step after noticing.
 *
 * A discovery that only describes something leaves the person exactly where
 * they were, holding one more piece of information and no less work. This module
 * answers the only question that matters after "Omnio noticed X": **what is the
 * single safest thing it could now do for me?**
 *
 * Three rules decided the shape of everything here.
 *
 *  - **One action, never a menu.** Offering three options is asking someone to
 *    make a decision they did not want to make. Each discovery therefore maps to
 *    exactly one action, or to none — "none" being a perfectly good answer when
 *    no action is clearly safe.
 *  - **Never guess with someone's files.** Where the safe move is organising
 *    rather than removing, the action organises. Only one action here removes
 *    anything, and only for files that are provably scaffolding: produced by a
 *    tool, already used to produce something else, and untouched for a week.
 *  - **The workspace does what the workspace can.** Most of the work in these
 *    discoveries is not tool work — it is finding, grouping, naming and tidying,
 *    all of which Omnio can simply do. Actions that genuinely need a tool say so
 *    and hand off; they never pretend to have run something they did not.
 *
 * Pure functions: this decides *what* to offer, never performs it. The effects
 * live in the store, so the decision stays trivially testable and the two cannot
 * drift into disagreeing about what an action means.
 */

import type { Discovery } from "./discoveries.ts";

/* ---------------------------------------------------------------- shapes */

export type WorkspaceActionKind =
  /** Group files under a new collection. Reversible, touches no bytes. */
  | "collect"
  /** Drop the bytes of files that are provably leftovers, keeping every record. */
  | "archive"
  /** Save an observed sequence as a re-runnable chain. */
  | "remember-chain"
  /** Rebuild an output whose source has been replaced. Needs the tool. */
  | "regenerate"
  /** Apply the habitual tool to the files still missing it. Needs the tool. */
  | "apply-tool";

interface ActionBase {
  kind: WorkspaceActionKind;
  /** The discovery this answers, so a performed action can retire it. */
  discoveryId: string;
  /** Everything the action will touch. */
  fileIds: string[];
  /**
   * True when the effect cannot be taken back, so the interface can say so
   * plainly rather than discovering it afterwards.
   */
  irreversible: boolean;
}

/**
 * How to name the collection this action creates.
 *
 * Structured rather than a finished string because the name is user-facing and
 * therefore translated, and this module has no business knowing about locales.
 * The caller resolves it and passes the result back in.
 */
export type CollectionName =
  | { from: "stem"; stem: string }
  | { from: "session"; startedAt: number };

export interface CollectAction extends ActionBase {
  kind: "collect";
  name: CollectionName;
}

export interface ArchiveAction extends ActionBase {
  kind: "archive";
  /** Bytes reclaimed, so the offer can state its own worth. */
  bytes: number;
}

export interface RememberChainAction extends ActionBase {
  kind: "remember-chain";
  steps: string[];
  /** Source mime types the sequence has been used on. */
  appliesTo: string[];
}

export interface RegenerateAction extends ActionBase {
  kind: "regenerate";
  /** The tool that made the stale output, and must make the new one. */
  toolId: string;
  /** The newer source to feed it. */
  sourceFileId: string;
  /** The stale output, retired once the replacement exists. */
  replacesFileId: string;
}

export interface ApplyToolAction extends ActionBase {
  kind: "apply-tool";
  toolId: string;
}

export type WorkspaceAction =
  | CollectAction
  | ArchiveAction
  | RememberChainAction
  | RegenerateAction
  | ApplyToolAction;

/* -------------------------------------------------------------- decision */

/**
 * The single safest next step for a discovery, or null when there is none.
 *
 * Two discoveries deliberately return an organising action rather than a
 * removing one. Several versions of a document, or one picture at several sizes,
 * look like cleanup — but Omnio cannot know which draft someone still needs, or
 * whether the small copy is the one already embedded somewhere. Grouping leaves
 * the decision with the person while still doing the tedious half of the job.
 */
export function actionFor(discovery: Discovery): WorkspaceAction | null {
  switch (discovery.kind) {
    case "superseded-export":
      return {
        kind: "regenerate",
        discoveryId: discovery.id,
        fileIds: [discovery.replacement.id, discovery.result.id],
        irreversible: false,
        toolId: discovery.toolId,
        sourceFileId: discovery.replacement.id,
        replacesFileId: discovery.result.id,
      };

    case "repeated-sequence":
      return {
        kind: "remember-chain",
        discoveryId: discovery.id,
        fileIds: [],
        irreversible: false,
        steps: discovery.steps,
        appliesTo: discovery.appliesTo,
      };

    case "habit":
      // Nothing to apply it to means nothing to offer; the detector already
      // refuses to report a habit in that state, but the action must not assume it.
      if (discovery.pending.length === 0) return null;
      return {
        kind: "apply-tool",
        discoveryId: discovery.id,
        fileIds: discovery.pending.map((file) => file.id),
        irreversible: false,
        toolId: discovery.toolId,
      };

    case "document-versions":
      return {
        kind: "collect",
        discoveryId: discovery.id,
        fileIds: discovery.files.map((file) => file.id),
        irreversible: false,
        name: { from: "stem", stem: discovery.stem },
      };

    case "image-sizes":
      return {
        kind: "collect",
        discoveryId: discovery.id,
        fileIds: discovery.files.map((file) => file.id),
        irreversible: false,
        name: { from: "stem", stem: discovery.stem },
      };

    case "work-session":
      // A session whose files are gone is a memory, not something to group.
      if (discovery.files.length < 2) return null;
      return {
        kind: "collect",
        discoveryId: discovery.id,
        fileIds: discovery.files.map((file) => file.id),
        irreversible: false,
        name: { from: "session", startedAt: discovery.startedAt },
      };

    case "stepping-stones":
      return {
        kind: "archive",
        discoveryId: discovery.id,
        fileIds: discovery.files.map((file) => file.id),
        // The bytes are gone for good. Every other action here can be undone,
        // so this is the one the interface must be honest about up front.
        irreversible: true,
        bytes: discovery.reclaimableBytes,
      };
  }
}

/**
 * Whether performing this action needs a tool, and therefore a handoff.
 *
 * The distinction matters to the interface: an action the workspace can perform
 * itself finishes where the person is standing, while a handoff takes them
 * somewhere. Promising the first and delivering the second is how a feature like
 * this loses trust.
 */
export function isHandoff(action: WorkspaceAction): boolean {
  return action.kind === "regenerate" || action.kind === "apply-tool";
}
