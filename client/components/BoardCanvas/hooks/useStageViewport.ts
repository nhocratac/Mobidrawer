// useStageViewport: zoom (0.5x-5x, wheel), pan, and screen<->stage coordinate
// transforms for BoardCanvas's Konva Stage. Parity with the prior render
// layer's handleZoom/handleMouseDown/handleMouseMove translate+scale state.
import { useCallback, useEffect, useState } from "react";
import type Konva from "konva";

export interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 50;

// Grid layer sceneFunc: visual port of zoomableGridUtils.drawGridOnCanvas,
// adapted to world-space since the Konva Stage already owns scale/translate.
export const drawGridScene = (
  ctx: Konva.Context,
  scale: number,
  translate: Point,
  size: { width: number; height: number },
  visible: boolean
) => {
  if (!visible) return;
  const w = size.width / scale;
  const h = size.height / scale;
  const startX = -translate.x / scale;
  const startY = -translate.y / scale;
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 0.1 / scale;
  for (let x = Math.floor(startX / GRID_SIZE) * GRID_SIZE; x < startX + w; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + h);
    ctx.stroke();
  }
  for (let y = Math.floor(startY / GRID_SIZE) * GRID_SIZE; y < startY + h; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + w, y);
    ctx.stroke();
  }
};

interface UseStageViewportOptions {
  onSetScale?: (scale: number) => void;
}

export function useStageViewport({ onSetScale }: UseStageViewportOptions = {}) {
  // scale: plain multiplier. translate: {x,y} in SCREEN PIXELS.
  // Same semantics MultiCursor.tsx:68 consumes (translate.x/translate.y in
  // screen px added after scaling cursor coords).
  const [scale, setScale] = useState<number>(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const updateSize = () =>
      setStageSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Wheel-zoom: clamp to closed range [0.5, 5], parity with the prior
  // render layer's handleZoom (newScale = Math.min(Math.max(0.5, newScale), 5)).
  const handleWheel = useCallback(
    (deltaY: number) => {
      const delta = -deltaY;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      setScale((prevScale) => {
        const newScale = Math.min(Math.max(0.5, prevScale * zoomFactor), 5);
        if (onSetScale) onSetScale(newScale);
        return newScale;
      });
    },
    [onSetScale]
  );

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      setIsPanning(true);
      setPanStart({ x: clientX - translate.x, y: clientY - translate.y });
    },
    [translate]
  );

  const updatePan = useCallback(
    (clientX: number, clientY: number) => {
      setTranslate({ x: clientX - panStart.x, y: clientY - panStart.y });
    },
    [panStart]
  );

  const stopPan = useCallback(() => setIsPanning(false), []);

  // Screen -> stage (world) coordinate transform, parity with the prior
  // render layer's getTransformedCoordinates / getTransformedCoordinatesForCursor.
  // `offset` mirrors the penThickness/2 subtraction used for draw/move.
  const screenToStage = useCallback(
    (clientX: number, clientY: number, offset = 0): Point => ({
      x: (clientX - translate.x - offset) / scale,
      y: (clientY - translate.y - offset) / scale,
    }),
    [translate, scale]
  );

  return {
    scale,
    translate,
    stageSize,
    isPanning,
    handleWheel,
    startPan,
    updatePan,
    stopPan,
    screenToStage,
  };
}
