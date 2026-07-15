// useDrawing: pen-mode pointer handling appending to canvasPathsStore,
// publishing /app/board/draw/{boardId} as the prior render layer did
// (batched, flushed at 10 strokes or after a 1s timeout).
import { useCallback, useRef } from "react";
import {
  CanvasPath,
  useCanvasPathsStore,
} from "@/lib/Zustand/canvasPathsStore";
import { useStompStore } from "@/lib/Zustand/socketStore";

interface UseDrawingOptions {
  boardId: string;
  screenToStage: (clientX: number, clientY: number, offset?: number) => {
    x: number;
    y: number;
  };
}

const BATCH_INTERVAL = 1000;

export function useDrawing({ boardId, screenToStage }: UseDrawingOptions) {
  const { canvasPaths, addCanvasPaths, addPointToLastPath } =
    useCanvasPathsStore();
  const { client } = useStompStore();
  const batchRef = useRef<CanvasPath[]>([]);

  const sendBatch = useCallback(() => {
    if (batchRef.current.length === 0) return;
    batchRef.current.forEach((path) => {
      client?.publish({
        destination: `/app/board/draw/${boardId}`,
        body: JSON.stringify({ ...path, boardId }),
      });
    });
    batchRef.current = [];
  }, [client, boardId]);

  const startStroke = useCallback(
    (
      clientX: number,
      clientY: number,
      penColor: string,
      penThickness: number,
      penOpacity: number
    ) => {
      const { x, y } = screenToStage(clientX, clientY, penThickness / 2);
      addCanvasPaths(x, y, penColor, penThickness, penOpacity);
    },
    [screenToStage, addCanvasPaths]
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
    batchRef.current.push(lastPath);
    if (batchRef.current.length >= 10) {
      sendBatch();
    } else {
      setTimeout(sendBatch, BATCH_INTERVAL);
    }
  }, [sendBatch]);

  return { canvasPaths, startStroke, continueStroke, endStroke };
}
