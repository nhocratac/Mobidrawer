"use client";

import React, { useEffect, useRef, useState } from "react";
import { useBoardStoreof, useToolDevStore } from "@/lib/Zustand/store";
import PencilCanvas from "../CanvasDrawingOverlay/PencilCanvas";
import BoardGridContext from "./BoardGridContext";
import {
  initCanvases,
  drawGridOnCanvas,
  resizeCanvasHandler,
} from "./zoomableGridUtils";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";

// Định nghĩa interface cho tọa độ
interface Point {
  x: number;
  y: number;
}

// Interface cho vùng chọn
interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Interface cho một đường vẽ trên canvas
export interface CanvasPath {
  _id?: string; // ID từ MongoDB
  color: string;
  thickness: number;
  opacity: number;
  paths: Point[];
  isSelected?: boolean;
}

interface ZoomableGridProps {
  children: React.ReactNode;
  onSetScale?: (scale: number) => void;
  boardId: string
}

const ZoomableGrid: React.FC<ZoomableGridProps> = ({ children, onSetScale, boardId }) => {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  // Trạng thái quản lý scale, translate và các option khác
  const penColor = useToolDevStore((state) => state.pencil?.color);
  const [scale, setScale] = useState<number>(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(undefined);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const penThickness = useToolDevStore((state) => state.pencil?.thickness) || 1;
  const penOpacity = useToolDevStore((state) => state.pencil?.opacity) || 1;
  const { board } = useBoardStoreof();

  // Các trạng thái khác
  const mode = useToolDevStore((state) => state.mode);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [undoPressed, setUndoPressed] = useState<boolean>(false);
  const [isVisibleContextMenu, setIsVisibleContextMenu] = useState<boolean>(false);
  const [menuPosition, setMenuPosition] = useState<Point>({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const { canvasPaths, setCanvasPaths ,setSelectedPath,addCanvasPaths,addPointToLastPath} = useCanvasPathsStore();
  // const { canvasPaths, setCanvasPaths, updateCanvasPath ,setSelectedPath,addCanvasPaths,addPointToLastPath} = useCanvasPathsStore();

  // socket 
  const {client} = useStompStore()

  // Cập nhật state từ board nếu có
  useEffect(() => {
    if (board?.canvasPaths) {
      setCanvasPaths(board.canvasPaths);
      setBackgroundColor(board?.option?.backgroundColor);
      setGridVisible(board?.option?.grid);
    }
  }, [board]);

  // const setonePathInArrayPath = (index: number, newPath: CanvasPath) => {
  //   updateCanvasPath( index,newPath)
  // };

  // Hàm chuyển đổi tọa độ từ màn hình sang canvas gốc
  const getTransformedCoordinates = (x: number, y: number): Point => ({
    x: (x - translate.x - penThickness / 2) / scale,
    y: (y - translate.y - penThickness / 2) / scale,
  });

  // Xử lý undo bằng phím z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        if (!undoPressed) {
          e.preventDefault();
          //setCanvasPaths((prevPaths) => (prevPaths.length === 0 ? prevPaths : prevPaths.slice(0, -1)));
          setUndoPressed(true);
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const updatedPaths = canvasPaths.filter((path) => !path.isSelected);
        setCanvasPaths(updatedPaths);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "z") {
        setUndoPressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      console.log("remove event listener and unmount");
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const endSelection = () => {
    if (isSelecting && selectionRect) {
      setIsSelecting(false);
      const selectedPaths = canvasPaths.
        filter((paths) => isPathInSelection(paths.paths, selectionRect));

      setSelectedPath(selectedPaths);
      setSelectionRect(null);
    }
  };

  const isPathInSelection = (path: Point[], selectionRect: SelectionRect): boolean => {
    return path.some(({ x, y }) => {
      return (
        x >= Math.min(selectionRect.x1, selectionRect.x2) &&
        x <= Math.max(selectionRect.x1, selectionRect.x2) &&
        y >= Math.min(selectionRect.y1, selectionRect.y2) &&
        y <= Math.max(selectionRect.y1, selectionRect.y2)
      );
    });
  };

  // Khởi tạo canvas và xử lý resize
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (gridCanvas && drawCanvas) {
      initCanvases(gridCanvas, drawCanvas, drawGridOnCanvas, scale, translate, gridVisible);
      const resizeHandler = () => resizeCanvasHandler(gridCanvas, drawCanvas, drawGridOnCanvas, scale, translate);
      window.addEventListener("resize", resizeHandler);
      return () => {
        window.removeEventListener("resize", resizeHandler);
      };
    }
  }, [scale, translate, canvasPaths, gridVisible]);

  // Xử lý zoom
  const handleZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    let newScale = scale * zoomFactor;
    newScale = Math.min(Math.max(0.5, newScale), 5);
    setScale(newScale);
    if (onSetScale) onSetScale(newScale);
  };

  // Thêm canvasPathBatch
  const BATCH_INTERVAL = 1000;
  let canvasPathBatch: CanvasPath[] = [];

  // Hàm gửi batch
  const sendBatch = () => {
    if (canvasPathBatch.length > 0) {
      canvasPathBatch.forEach(path => {
        client?.publish({
          destination: `/app/board/draw/${boardId}`,
          body: JSON.stringify({
            ...path,
            boardId: boardId
          }),
        });
      });

      console.log(canvasPathBatch);
  
      canvasPathBatch = []; // Reset batch sau khi gửi
    }
  };

  // Xử lý sự kiện chuột
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (mode === "drag" && e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    } else if (mode === "pen" && e.button === 0) {
      e.preventDefault();
      setIsDrawing(true);
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
      // setCanvasPaths((prev) => [
      //   ...prev,
      //   { color: penColor, thickness: penThickness, opacity: penOpacity, paths: [{ x, y }] },
      // ]);
      addCanvasPaths(x,y,penColor,penThickness,penOpacity)
    } else if (mode === "idle" && e.button === 0) {
      e.preventDefault();
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
      setIsSelecting(true);
      setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
    }
  };


  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (isPanning && mode === "drag") {
      setTranslate({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (isDrawing && mode === "pen") {
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
      addPointToLastPath(x,y)
      // Nếu cần, gửi dữ liệu realtime qua WebSocket
    } else if (isSelecting && mode === "idle") {
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
      setSelectionRect((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (mode === "drag" && e.button === 0) setIsPanning(false);
    if (mode === "pen" && e.button === 0) {
      // Thêm nét vẽ vào batch
      canvasPathBatch.push(canvasPaths[canvasPaths.length - 1]);
  
      // Gửi canvasPathBatch nếu đủ lớn hoặc sau một khoảng thời gian
      if (canvasPathBatch.length >= 10) { // Ví dụ: gửi khi có 10 nét vẽ
        sendBatch();
      } else {
        setTimeout(sendBatch, BATCH_INTERVAL);
      }
      setIsDrawing(false);
    };
    if (mode === "idle" && e.button === 0) endSelection();
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setIsDrawing(false);
  };

  const getTransformedStyle = (): React.CSSProperties => ({
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    transformOrigin: "0 0",
  });

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setIsVisibleContextMenu(true);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className={`relative ${backgroundColor ? backgroundColor : "bg-slate-700"}`}
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
      onWheel={handleZoom}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      onClick={() => setIsVisibleContextMenu(false)}
    >
      <canvas
        ref={gridCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: mode === "drag" ? "grabbing" : mode === "pen" ? "pointer" : "default",
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      <canvas
        ref={drawCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: mode === "drag" ? "grabbing" : mode === "pen" ? "pointer" : "default",
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {canvasPaths &&
          canvasPaths.map((pathData, index) => (
            <PencilCanvas
              key={index}
              color={pathData.color}
              thickness={pathData.thickness}
              paths={pathData.paths}
              opacity={pathData.opacity}
              scale={scale}
              translate={translate}
              isSelected={!!pathData.isSelected}
            />
          ))}
      </div>
      {isSelecting && selectionRect && (
        <div
          className="absolute border-2 border-blue-500"
          style={{
            left: Math.min(selectionRect.x1, selectionRect.x2) * scale + translate.x,
            top: Math.min(selectionRect.y1, selectionRect.y2) * scale + translate.y,
            width: Math.abs(selectionRect.x2 - selectionRect.x1) * scale,
            height: Math.abs(selectionRect.y2 - selectionRect.y1) * scale,
          }}
        />
      )}
      {isVisibleContextMenu && (
        <BoardGridContext menuPosition={menuPosition} isVisible={isVisibleContextMenu} />
      )}
      <div className="absolute top-0 bg-red-600" style={getTransformedStyle()}>
        {children}
      </div>
    </div>
  );
};

export default ZoomableGrid;