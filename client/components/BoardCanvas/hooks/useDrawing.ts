// useDrawing: pen-mode pointer handling appending to canvasPathsStore. The
// actual draw-destination publish (batching, own-echo mapping, reconnect
// retry) now lives entirely in usePathSync (Sprint 2); this hook only stamps
// local strokes and hands finished strokes to the shared pathSync queue via
// the injected queueDraw callback.
import { useCallback, useRef } from "react";
import {
  CanvasPath,
  useCanvasPathsStore,
} from "@/lib/Zustand/canvasPathsStore";
import useTokenStore from "@/lib/Zustand/tokenStore";

interface UseDrawingOptions {
  screenToStage: (clientX: number, clientY: number, offset?: number) => {
    x: number;
    y: number;
  };
  queueDraw: (path: CanvasPath) => void;
  // Sprint 3 undo/redo: records the finished stroke (by id-else-localId)
  // as an add-path entry. Called exactly once, from endStroke below.
  recordAdd: (path: CanvasPath) => void;
}

export function useDrawing({
  screenToStage,
  queueDraw,
  recordAdd,
}: UseDrawingOptions) {
  const { canvasPaths, addCanvasPaths, addPointToLastPath } =
    useCanvasPathsStore();
  const user = useTokenStore((s) => s.user);

  // Active-stroke gate. Only a startStroke (mousedown) opens it; continueStroke
  // is a no-op until then. Without this, a pen-mode mousemove with no button
  // held keeps appending to the last (finished) path — the Mac-trackpad
  // "keeps drawing while just moving the cursor" bug.
  const isDrawingRef = useRef(false);

  const startStroke = useCallback(
    (
      clientX: number,
      clientY: number,
      penColor: string,
      penThickness: number,
      penOpacity: number
    ) => {
      const { x, y } = screenToStage(clientX, clientY, penThickness / 2);
      addCanvasPaths(x, y, penColor, penThickness, penOpacity, user?.id);
      isDrawingRef.current = true;
    },
    [screenToStage, addCanvasPaths, user]
  );

  const continueStroke = useCallback(
    (clientX: number, clientY: number, penThickness: number) => {
      if (!isDrawingRef.current) return;
      const { x, y } = screenToStage(clientX, clientY, penThickness / 2);
      addPointToLastPath(x, y);
    },
    [screenToStage, addPointToLastPath]
  );

  const endStroke = useCallback(() => {
    // Idempotent: mouseleave + mouseup can both fire for one stroke, and
    // stray mousemoves with no active stroke must not finalize anything.
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const lastPath =
      useCanvasPathsStore.getState().canvasPaths.slice(-1)[0];
    if (!lastPath) return;
    recordAdd(lastPath);
    queueDraw(lastPath);
  }, [queueDraw, recordAdd]);

  return { canvasPaths, startStroke, continueStroke, endStroke };
}
