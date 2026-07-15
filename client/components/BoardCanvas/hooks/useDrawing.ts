// useDrawing: pen-mode pointer handling appending to canvasPathsStore. The
// actual draw-destination publish (batching, own-echo mapping, reconnect
// retry) now lives entirely in usePathSync (Sprint 2); this hook only stamps
// local strokes and hands finished strokes to the shared pathSync queue via
// the injected queueDraw callback.
import { useCallback } from "react";
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
    },
    [screenToStage, addCanvasPaths, user]
  );

  const continueStroke = useCallback(
    (clientX: number, clientY: number, penThickness: number) => {
      const { x, y } = screenToStage(clientX, clientY, penThickness / 2);
      addPointToLastPath(x, y);
    },
    [screenToStage, addPointToLastPath]
  );

  const endStroke = useCallback(() => {
    const lastPath =
      useCanvasPathsStore.getState().canvasPaths.slice(-1)[0];
    if (!lastPath) return;
    recordAdd(lastPath);
    queueDraw(lastPath);
  }, [queueDraw, recordAdd]);

  return { canvasPaths, startStroke, continueStroke, endStroke };
}
