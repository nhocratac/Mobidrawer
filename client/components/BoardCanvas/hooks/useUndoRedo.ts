// useUndoRedo: local (session-only) undo/redo for own path actions
// (add-path / delete-paths / move-paths). Recording happens ONLY at the
// three local user-action sites (useDrawing.endStroke, useSelection's
// Delete/Backspace handler, useSelection.endMove) via the record* callbacks
// returned below; the executor below never calls those recorders itself.
// Inverse work is published exclusively through the helpers usePathSync
// already returns (queueDraw / publishUpdatePaths / publishDeletePaths) —
// this file makes no direct STOMP client call and contains no destination
// string.
// See Sprint 3 contract (BRD-UNDO-REDO-2026-07-15-01) for the design
// rationale (stale-id stripping on re-add, pre-move snapshot rule, partial/
// full prune semantics).
import { useCallback, useEffect, useRef } from "react";
import {
  CanvasPath,
  Point,
  useCanvasPathsStore,
} from "@/lib/Zustand/canvasPathsStore";

// A path's identity for undo/redo purposes: its server id if it has one,
// else its client-only localId.
type Ref = string;

interface AddEntry {
  kind: "add";
  refs: Ref[];
}

interface DeleteEntry {
  kind: "delete";
  paths: CanvasPath[];
}

interface MoveItem {
  ref: Ref;
  points: Point[];
}

interface MoveEntry {
  kind: "move";
  items: MoveItem[];
}

type UndoEntry = AddEntry | DeleteEntry | MoveEntry;

const MAX_STACK_SIZE = 50;

function refOf(path: CanvasPath): Ref | undefined {
  return path.id ?? path.localId;
}

// Pushes onto a stack, dropping the OLDEST entry when the cap is exceeded.
// Used for every push path on BOTH stacks (user-action push, undo->redo
// push, redo->undo push).
function pushCapped(stack: UndoEntry[], entry: UndoEntry): UndoEntry[] {
  const next = [...stack, entry];
  if (next.length > MAX_STACK_SIZE) {
    next.shift();
  }
  return next;
}

interface PathSyncHelpers {
  queueDraw: (path: CanvasPath) => void;
  publishUpdatePaths: (getSelectedPaths: () => CanvasPath[]) => void;
  publishDeletePaths: (ids: string[]) => void;
}

interface UseUndoRedoOptions {
  pathSync: PathSyncHelpers;
  ownerId?: string;
}

export function useUndoRedo({ pathSync, ownerId }: UseUndoRedoOptions) {
  // Session-local stacks held inside the hook body (no module-level
  // mutable state); lost on reload by design (v1 accepted risk).
  const undoStackRef = useRef<UndoEntry[]>([]);
  const redoStackRef = useRef<UndoEntry[]>([]);

  const removePathsByIdentity = useCanvasPathsStore(
    (s) => s.removePathsByIdentity
  );
  const restorePathPoints = useCanvasPathsStore((s) => s.restorePathPoints);
  const readdPath = useCanvasPathsStore((s) => s.readdPath);

  // A NEW user-action push always clears the redoStack (linear history).
  const record = useCallback((entry: UndoEntry) => {
    undoStackRef.current = pushCapped(undoStackRef.current, entry);
    redoStackRef.current = [];
  }, []);

  const resolveRef = useCallback((ref: Ref): CanvasPath | undefined => {
    const paths = useCanvasPathsStore.getState().canvasPaths;
    return (
      paths.find((p) => p.id === ref) ?? paths.find((p) => p.localId === ref)
    );
  }, []);

  // Executes an "add" entry: resolves each ref (id first, then localId),
  // prunes unresolvable ones, removes survivors locally, and publishes
  // delete only for survivors that already carry a server id. Returns the
  // opposite entry (delete, carrying survivors-only full data) or null when
  // fully pruned.
  const executeAdd = useCallback(
    (entry: AddEntry): DeleteEntry | null => {
      const resolved = entry.refs
        .map((ref) => resolveRef(ref))
        .filter((p): p is CanvasPath => Boolean(p));
      if (resolved.length === 0) return null;

      const survivorRefs = resolved
        .map((p) => refOf(p))
        .filter((r): r is string => Boolean(r));
      removePathsByIdentity(survivorRefs);

      const idsToDelete = resolved
        .map((p) => p.id)
        .filter((id): id is string => Boolean(id));
      if (idsToDelete.length > 0) pathSync.publishDeletePaths(idsToDelete);

      return { kind: "delete", paths: resolved };
    },
    [resolveRef, removePathsByIdentity, pathSync]
  );

  // Executes a "delete" entry: self-contained (full path data carried on the
  // entry), always applicable without store lookup. Re-adds each path via
  // the store's readdPath action, which STRIPS the stale pre-delete id and
  // stamps a fresh localId/ownerId, then queues the freshly stamped object
  // for draw so the pending-echo FIFO maps the new server id correctly.
  const executeDelete = useCallback(
    (entry: DeleteEntry): AddEntry => {
      const newRefs: Ref[] = [];
      entry.paths.forEach((path) => {
        const newPath = readdPath(path, ownerId);
        const ref = refOf(newPath);
        if (ref) newRefs.push(ref);
        pathSync.queueDraw(newPath);
      });
      // The opposite (redo/undo) entry references the re-added paths' NEW
      // identities, never the stale pre-delete ids.
      return { kind: "add", refs: newRefs };
    },
    [readdPath, ownerId, pathSync]
  );

  // Executes a "move" entry: resolves each item's ref, prunes unresolvable
  // ones, restores the recorded points for survivors, and publishes the
  // restored set. Returns the opposite entry (survivors-only, carrying the
  // pre-restore points as the new inverse) or null when fully pruned.
  const executeMove = useCallback(
    (entry: MoveEntry): MoveEntry | null => {
      const resolvedItems = entry.items
        .map((item) => {
          const path = resolveRef(item.ref);
          if (!path) return null;
          const ref = refOf(path);
          if (!ref) return null;
          return { ref, points: item.points, currentPoints: path.paths };
        })
        .filter(
          (
            x
          ): x is { ref: Ref; points: Point[]; currentPoints: Point[] } =>
            Boolean(x)
        );
      if (resolvedItems.length === 0) return null;

      restorePathPoints(
        resolvedItems.map((item) => ({ ref: item.ref, points: item.points }))
      );

      const restoredRefs = new Set(resolvedItems.map((item) => item.ref));
      pathSync.publishUpdatePaths(() =>
        useCanvasPathsStore
          .getState()
          .canvasPaths.filter((p) => {
            const ref = refOf(p);
            return ref ? restoredRefs.has(ref) : false;
          })
      );

      return {
        kind: "move",
        items: resolvedItems.map((item) => ({
          ref: item.ref,
          points: item.currentPoints,
        })),
      };
    },
    [resolveRef, restorePathPoints, pathSync]
  );

  const executeEntry = useCallback(
    (entry: UndoEntry): UndoEntry | null => {
      if (entry.kind === "add") return executeAdd(entry);
      if (entry.kind === "delete") return executeDelete(entry);
      return executeMove(entry);
    },
    [executeAdd, executeDelete, executeMove]
  );

  // Empty-stack undo/redo is an explicit no-op. A fully-pruned entry is
  // dropped (never transferred to the opposite stack) and the loop
  // continues to the next entry on the same stack until one executes or
  // the stack empties.
  const undo = useCallback(() => {
    while (undoStackRef.current.length > 0) {
      const entry = undoStackRef.current[undoStackRef.current.length - 1];
      undoStackRef.current = undoStackRef.current.slice(0, -1);
      const opposite = executeEntry(entry);
      if (opposite) {
        redoStackRef.current = pushCapped(redoStackRef.current, opposite);
        return;
      }
    }
  }, [executeEntry]);

  const redo = useCallback(() => {
    while (redoStackRef.current.length > 0) {
      const entry = redoStackRef.current[redoStackRef.current.length - 1];
      redoStackRef.current = redoStackRef.current.slice(0, -1);
      const opposite = executeEntry(entry);
      if (opposite) {
        undoStackRef.current = pushCapped(undoStackRef.current, opposite);
        return;
      }
    }
  }, [executeEntry]);

  // --- recording API, called ONLY from the three local user-action sites --
  const recordAdd = useCallback(
    (path: CanvasPath) => {
      const ref = refOf(path);
      if (!ref) return;
      record({ kind: "add", refs: [ref] });
    },
    [record]
  );

  const recordDelete = useCallback(
    (paths: CanvasPath[]) => {
      if (paths.length === 0) return;
      record({ kind: "delete", paths });
    },
    [record]
  );

  const recordMove = useCallback(
    (items: MoveItem[]) => {
      if (items.length === 0) return;
      record({ kind: "move", items });
    },
    [record]
  );

  // Document-level keydown listener: Ctrl+Z/Cmd+Z (shiftKey false) undoes,
  // Ctrl+Shift+Z/Cmd+Shift+Z redoes; skips entirely inside input elements;
  // removed on unmount. Ctrl+Y is intentionally unbound (scope.excluded).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.contentEditable === "true" ||
        target.closest('input, textarea, [contenteditable="true"]');
      if (isInputElement) return;

      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return { recordAdd, recordDelete, recordMove, undo, redo };
}
