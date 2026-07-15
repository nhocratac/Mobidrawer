"use client";

import React, { useEffect, useState } from "react";
import { Stage, Layer, Line, Rect, Shape } from "react-konva";
import Konva from "konva";
import { useBoardStoreof, useToolDevStore } from "@/lib/Zustand/store";
import { ModeType } from "@/lib/Zustand/type.type";
import { useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";
import { useStompStore } from "@/lib/Zustand/socketStore";
import BoardGridContext from "../BoardGrid/BoardGridContext";
import MultiCursor from "../MultiCursor/MultiCursor";
import { useStageViewport, drawGridScene } from "./hooks/useStageViewport";
import { useDrawing } from "./hooks/useDrawing";
import { useSelection } from "./hooks/useSelection";

interface Point { x: number; y: number; }
interface BoardCanvasProps { children: React.ReactNode; onSetScale?: (scale: number) => void; boardId: string; }

const BoardCanvas: React.FC<BoardCanvasProps> = ({ children, onSetScale, boardId }) => {
  const { board } = useBoardStoreof();
  const setCanvasPaths = useCanvasPathsStore((s) => s.setCanvasPaths);
  const mode = useToolDevStore((s) => s.mode);
  const penColor = useToolDevStore((s) => s.pencil?.color) || "black";
  const penThickness = useToolDevStore((s) => s.pencil?.thickness) || 1;
  const penOpacity = useToolDevStore((s) => s.pencil?.opacity) || 1;
  const { client } = useStompStore();

  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(undefined);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [isVisibleContextMenu, setIsVisibleContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<Point>({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const { scale, translate, stageSize, isPanning, handleWheel, startPan, updatePan, stopPan, screenToStage } = useStageViewport({ onSetScale });
  const { canvasPaths, startStroke, continueStroke, endStroke } = useDrawing({ boardId, screenToStage });
  const selection = useSelection({ boardId, screenToStage });
  const { isSelecting, selectionRect, isMoving, selectionBoundingBox } = selection;

  useEffect(() => {
    if (board?.canvasPaths) {
      setCanvasPaths(board.canvasPaths);
      setBackgroundColor(board?.option?.backgroundColor);
      setGridVisible(board?.option?.grid);
    }
  }, [board, setCanvasPaths]);

  // Cursor position publish to /app/board/cursor/{boardId}, 100ms interval (parity with the prior render layer).
  useEffect(() => {
    const interval = setInterval(() => {
      if (cursorPos && client && boardId) {
        client.publish({
          destination: `/app/board/cursor/${boardId}`,
          body: JSON.stringify({ ...cursorPos, userId: "current-user-id", userName: "You", color: "#FF0000", lastUpdated: Date.now() }),
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [cursorPos, client, boardId]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (mode === ModeType.drag && evt.button === 0) { evt.preventDefault(); startPan(evt.clientX, evt.clientY); }
    else if (mode === ModeType.pen && evt.button === 0) { evt.preventDefault(); startStroke(evt.clientX, evt.clientY, penColor, penThickness, penOpacity); }
    else if (mode === ModeType.idle && evt.button === 0) {
      evt.preventDefault();
      const { x, y } = screenToStage(evt.clientX, evt.clientY);
      if (selection.isPointInBoundingBox(x, y)) selection.startMove(evt.clientX, evt.clientY);
      else selection.startSelection(evt.clientX, evt.clientY);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    setCursorPos(screenToStage(evt.clientX, evt.clientY));
    if (isPanning && mode === ModeType.drag) updatePan(evt.clientX, evt.clientY);
    else if (mode === ModeType.pen) continueStroke(evt.clientX, evt.clientY, penThickness);
    else if (isSelecting && mode === ModeType.idle) selection.updateSelectionRect(evt.clientX, evt.clientY);
    else if (isMoving && mode === ModeType.idle) selection.moveSelected(evt.clientX, evt.clientY);
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (mode === ModeType.drag && evt.button === 0) stopPan();
    if (mode === ModeType.pen && evt.button === 0) endStroke();
    if (mode === ModeType.idle && evt.button === 0) {
      if (isSelecting) selection.endSelection();
      else if (isMoving) selection.endMove();
      else selection.clearSelection();
    }
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    setIsVisibleContextMenu(true);
    setMenuPosition({ x: e.evt.clientX, y: e.evt.clientY });
  };

  return (
    <div className={`relative ${backgroundColor || "bg-slate-700"}`} style={{ width: "100vw", height: "100vh", overflow: "hidden" }} id="board-area">
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={translate.x}
        y={translate.y}
        onWheel={(e) => { e.evt.preventDefault(); handleWheel(e.evt.deltaY); }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={stopPan}
        onContextMenu={handleContextMenu}
        onClick={() => setIsVisibleContextMenu(false)}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          <Shape sceneFunc={(ctx) => drawGridScene(ctx, scale, translate, stageSize, gridVisible)} />
        </Layer>
        {/* Paths layer: one Konva Line per CanvasPath */}
        <Layer>
          {canvasPaths.map((path, index) => (
            <Line key={path.id ?? index} points={path.paths.flatMap((p) => [p.x, p.y])} stroke={path.color} strokeWidth={path.thickness} opacity={path.opacity} lineCap="round" lineJoin="round" />
          ))}
        </Layer>
        {/* Selection layer: rubber-band rect + bounding box of selected paths */}
        <Layer listening={false}>
          {isSelecting && selectionRect && (
            <Rect
              x={Math.min(selectionRect.x1, selectionRect.x2)}
              y={Math.min(selectionRect.y1, selectionRect.y2)}
              width={Math.abs(selectionRect.x2 - selectionRect.x1)}
              height={Math.abs(selectionRect.y2 - selectionRect.y1)}
              stroke="#3b82f6"
              strokeWidth={2 / scale}
            />
          )}
          {selectionBoundingBox && (
            <Rect x={selectionBoundingBox.x} y={selectionBoundingBox.y} width={selectionBoundingBox.width} height={selectionBoundingBox.height} stroke="black" dash={[4 / scale, 4 / scale]} strokeWidth={2 / scale} />
          )}
        </Layer>
      </Stage>
      {isVisibleContextMenu && <BoardGridContext menuPosition={menuPosition} isVisible={isVisibleContextMenu} />}
      <div className="absolute top-0" style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
        {children}
      </div>
      <MultiCursor scale={scale} translate={translate} boardId={boardId} />
    </div>
  );
};

export default BoardCanvas;
