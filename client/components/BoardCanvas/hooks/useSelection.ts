// useSelection: rubber-band select, bounding box of selected paths, move
// selected paths (throttled move-destination publish during drag + debounced
// update-destination publish on move completion), and keyboard Delete/
// Backspace removal — all parity-ported from the prior render layer. The
// actual STOMP publishes (and their throttle/debounce timing) now live in
// usePathSync (Sprint 2); this hook only computes the next state and calls
// the injected publish callbacks.
import { useCallback, useEffect, useState } from "react";
import { produce } from "immer";
import {
  CanvasPath,
  useCanvasPathsStore,
} from "@/lib/Zustand/canvasPathsStore";

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
  screenToStage: (clientX: number, clientY: number, offset?: number) => Point;
  publishMovePaths: (paths: CanvasPath[]) => void;
  resetMoveThrottle: () => void;
  publishUpdatePaths: (getSelectedPaths: () => CanvasPath[]) => void;
  publishDeletePaths: (ids: string[]) => void;
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

export function useSelection({
  screenToStage,
  publishMovePaths,
  resetMoveThrottle,
  publishUpdatePaths,
  publishDeletePaths,
}: UseSelectionOptions) {
  const { canvasPaths, setCanvasPaths, setSelectedPath } =
    useCanvasPathsStore();

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );
  const [isMoving, setIsMoving] = useState(false);
  const [moveStart, setMoveStart] = useState<Point>({ x: 0, y: 0 });
  const [selectionBoundingBox, setSelectionBoundingBox] =
    useState<BoundingBox | null>(null);

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
          .filter(Boolean) as string[];

        publishDeletePaths(pathIds);

        // Id-agnostic local removal (parity with the prior render layer's
      // setCanvasPaths(canvasPaths.filter(p => !p.isSelected))): id-less
      // unpersisted paths are removed too.
        setCanvasPaths(canvasPaths.filter((path) => !path.isSelected));
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canvasPaths, publishDeletePaths, setCanvasPaths]);

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

      publishMovePaths(updatedPaths);
    },
    [isMoving, moveStart, canvasPaths, setCanvasPaths, publishMovePaths]
  );

  const endMove = useCallback(() => {
    if (!isMoving) return;
    setIsMoving(false);
    resetMoveThrottle();

    // Debounced move-completion publish, distinct from the during-drag
    // move-paths publish above.
    publishUpdatePaths(() =>
      useCanvasPathsStore.getState().canvasPaths.filter((p) => p.isSelected)
    );
  }, [isMoving, resetMoveThrottle, publishUpdatePaths]);

  const clearSelection = useCallback(() => setSelectedPath([]), [setSelectedPath]);

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
