// useSelection: rubber-band select, bounding box of selected paths, move
// selected paths (throttled /app/board/move-paths/ during drag + debounced
// /app/board/update-paths/ on move completion), and keyboard Delete/Backspace
// removal — all parity-ported from the prior render layer.
import { useCallback, useEffect, useRef, useState } from "react";
import { produce } from "immer";
import {
  CanvasPath,
  useCanvasPathsStore,
} from "@/lib/Zustand/canvasPathsStore";
import { useStompStore } from "@/lib/Zustand/socketStore";

interface Point {
  x: number;
  y: number;
}

interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseSelectionOptions {
  boardId: string;
  screenToStage: (clientX: number, clientY: number, offset?: number) => Point;
}

const isPathInSelection = (path: Point[], rect: SelectionRect): boolean =>
  path?.some(
    ({ x, y }) =>
      x >= Math.min(rect.x1, rect.x2) &&
      x <= Math.max(rect.x1, rect.x2) &&
      y >= Math.min(rect.y1, rect.y2) &&
      y <= Math.max(rect.y1, rect.y2)
  );

const calculateBoundingBox = (paths: CanvasPath[]): BoundingBox | null => {
  if (paths.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  paths.forEach((path) => {
    path.paths.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export function useSelection({ boardId, screenToStage }: UseSelectionOptions) {
  const { canvasPaths, setCanvasPaths, setSelectedPath } =
    useCanvasPathsStore();
  const { client } = useStompStore();

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const [isMoving, setIsMoving] = useState(false);
  const [moveStart, setMoveStart] = useState<Point>({ x: 0, y: 0 });
  const [selectionBoundingBox, setSelectionBoundingBox] =
    useState<BoundingBox | null>(null);

  const isFirstMove = useRef(true);
  const lastUpdateTimeRef = useRef(0);
  const moveUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const selected = canvasPaths.filter((p) => p.isSelected);
    setSelectionBoundingBox(calculateBoundingBox(selected));
  }, [canvasPaths]);

  // Keyboard Delete/Backspace: id-agnostic local removal (parity with the
  // prior render layer's setCanvasPaths(canvasPaths.filter(p => !p.isSelected)))
  // plus publish of only the ids that exist.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputElement =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.contentEditable === "true" ||
        target.closest('input, textarea, [contenteditable="true"]');
      if (isInputElement) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const hasSelectedPaths = canvasPaths.some((path) => path.isSelected);
        if (!hasSelectedPaths) return;

        const pathIds = canvasPaths
          .filter((path) => path.isSelected)
          .map((path) => path.id)
          .filter(Boolean);

        client?.publish({
          destination: `/app/board/delete-paths/${boardId}`,
          body: JSON.stringify(pathIds),
        });

        // Id-agnostic local removal (parity with the prior render layer's
      // setCanvasPaths(canvasPaths.filter(p => !p.isSelected))): id-less
      // unpersisted paths are removed too.
        setCanvasPaths(canvasPaths.filter((path) => !path.isSelected));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canvasPaths, boardId, client, setCanvasPaths]);

  const startSelection = useCallback(
    (clientX: number, clientY: number) => {
      const { x, y } = screenToStage(clientX, clientY);
      setSelectedPath([]);
      setIsSelecting(true);
      setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
    },
    [screenToStage, setSelectedPath]
  );

  const updateSelectionRect = useCallback(
    (clientX: number, clientY: number) => {
      const { x, y } = screenToStage(clientX, clientY);
      setSelectionRect((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
    },
    [screenToStage]
  );

  const endSelection = useCallback(() => {
    if (!selectionRect) return;
    setIsSelecting(false);
    const selected = canvasPaths.filter((p) =>
      isPathInSelection(p.paths, selectionRect)
    );
    setSelectedPath(selected);
    setSelectionRect(null);
  }, [selectionRect, canvasPaths, setSelectedPath]);

  const isPointInBoundingBox = useCallback(
    (x: number, y: number) =>
      !!selectionBoundingBox &&
      x >= selectionBoundingBox.x &&
      x <= selectionBoundingBox.x + selectionBoundingBox.width &&
      y >= selectionBoundingBox.y &&
      y <= selectionBoundingBox.y + selectionBoundingBox.height,
    [selectionBoundingBox]
  );

  const startMove = useCallback(
    (clientX: number, clientY: number) => {
      const { x, y } = screenToStage(clientX, clientY);
      setIsMoving(true);
      setMoveStart({ x, y });
    },
    [screenToStage]
  );

  const moveSelected = useCallback(
    (clientX: number, clientY: number) => {
      if (!isMoving) return;
      const { x, y } = screenToStage(clientX, clientY);
      const dx = x - moveStart.x;
      const dy = y - moveStart.y;

      const updatedPaths = produce(canvasPaths, (draft) => {
        draft
          .filter((p) => p.isSelected && p.paths && p.paths.length > 0)
          .forEach((p) => {
            p.paths = p.paths.map((pt) => ({
              ...pt,
              x: pt.x + dx,
              y: pt.y + dy,
            }));
          });
      });

      setCanvasPaths(updatedPaths);
      setMoveStart({ x, y });

      const now = Date.now();
      if (isFirstMove.current) {
        lastUpdateTimeRef.current = now;
        isFirstMove.current = false;
        return;
      }
      if (now - lastUpdateTimeRef.current >= 500) {
        client?.publish({
          destination: `/app/board/move-paths/${boardId}`,
          body: JSON.stringify(updatedPaths),
        });
        lastUpdateTimeRef.current = now;
      }
    },
    [isMoving, moveStart, canvasPaths, setCanvasPaths, client, boardId]
  );

  const endMove = useCallback(() => {
    if (!isMoving) return;
    setIsMoving(false);
    isFirstMove.current = true;

    if (moveUpdateTimeoutRef.current) clearTimeout(moveUpdateTimeoutRef.current);
    // Debounced move-completion publish, distinct from the during-drag
    // move-paths publish above.
    moveUpdateTimeoutRef.current = setTimeout(() => {
      const selected = useCanvasPathsStore
        .getState()
        .canvasPaths.filter((p) => p.isSelected);
      if (selected.length > 0 && client) {
        const pathsToUpdate = selected.map((p) => ({ ...p, boardId }));
        pathsToUpdate.forEach((p) => delete (p as { isSelected?: boolean }).isSelected);
        client.publish({
          destination: `/app/board/update-paths/${boardId}`,
          body: JSON.stringify({ paths: pathsToUpdate }),
        });
      }
    }, 500);
  }, [isMoving, client, boardId]);

  const clearSelection = useCallback(() => setSelectedPath([]), [setSelectedPath]);

  useEffect(() => {
    return () => {
      if (moveUpdateTimeoutRef.current) clearTimeout(moveUpdateTimeoutRef.current);
    };
  }, []);

  return {
    canvasPaths,
    isSelecting,
    selectionRect,
    isMoving,
    selectionBoundingBox,
    startSelection,
    updateSelectionRect,
    endSelection,
    isPointInBoundingBox,
    startMove,
    moveSelected,
    endMove,
    clearSelection,
  };
}
