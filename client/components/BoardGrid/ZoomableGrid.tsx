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
import { produce } from 'immer';

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
  id?: string; // ID từ MongoDB
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
  const [selectionBoundingBox, setSelectionBoundingBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [moveStart, setMoveStart] = useState<Point>({ x: 0, y: 0 });
  let moveUpdateTimeout: NodeJS.Timeout | null = null;
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
        const hasSelectedPaths = canvasPaths.some(path => path.isSelected);
        if (hasSelectedPaths) {
          const updatedPaths = canvasPaths.filter(path => !path.isSelected);
          setCanvasPaths(updatedPaths);

          const pathIds = canvasPaths.filter(path => path.isSelected).map(path => path.id);
          // Gửi thông báo xóa đường vẽ
          client?.publish({
            destination: `/app/board/delete-paths/${boardId}`,
            body: JSON.stringify(pathIds)
          });
        }
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
  }, [canvasPaths, undoPressed, boardId, client]);

  // Hàm kiểm tra đường vẽ có nằm trong vùng chọn không
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

  const calculateSelectionBoundingBox = (paths: CanvasPath[]) => {
    if (paths.length === 0) return null;
  
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
  
    paths.forEach(path => {
      if (path.isSelected) {
        path.paths.forEach(point => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      }
    });
  
    if (minX === Infinity) return null;
  
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  // Cập nhật khung bao quanh khi có thay đổi
  useEffect(() => {
    const selectedPaths = canvasPaths.filter(path => path.isSelected);
    setSelectionBoundingBox(calculateSelectionBoundingBox(selectedPaths));
  }, [canvasPaths]);

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

  // Hàm di chuyển canvasPaths đã chọn
  const moveSelectedPaths = (e: React.MouseEvent) => {
    if (!isMoving) return;
    
    e.preventDefault();
    const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
    const dx = x - moveStart.x;
    const dy = y - moveStart.y;
  
    // Sử dụng Immer để update state
    const updatedPaths = produce(canvasPaths, draftPaths => {
      draftPaths.forEach(path => {
        if (path.isSelected) {
          path.paths = path.paths.map(point => ({
            ...point,
            x: point.x + dx,
            y: point.y + dy
          }));
        }
      });
    });
  
    setCanvasPaths(updatedPaths);
    setMoveStart({ x, y });
  };

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

        // Kiểm tra xem có click vào khung bao quanh không
        const isClickInBoundingBox = selectionBoundingBox && 
        x >= selectionBoundingBox.x && 
        x <= selectionBoundingBox.x + selectionBoundingBox.width &&
        y >= selectionBoundingBox.y && 
        y <= selectionBoundingBox.y + selectionBoundingBox.height;
        
        if (isClickInBoundingBox) {
          // Click vào item đang chọn -> bắt đầu move
          setIsMoving(true);
          setMoveStart({ x, y });
        } else {
          // Click ra ngoài -> bỏ chọn ngay lập tức
          setSelectedPath([]);
          // Bắt đầu select mới
          setIsSelecting(true);
          setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
        }
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
    } else if (isMoving && mode === "idle") {
      moveSelectedPaths(e);
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
    if (mode === "idle" && e.button === 0) {
      
      if(isSelecting && selectionRect) { 
          setIsSelecting(false);
          const selectedPaths = canvasPaths.
            filter((paths) => isPathInSelection(paths.paths, selectionRect));

          setSelectedPath(selectedPaths);
          setSelectionRect(null);
      }
      else if(isMoving) {
        setIsMoving(false);

        // Debounce gửi update
        if (moveUpdateTimeout) clearTimeout(moveUpdateTimeout);
        moveUpdateTimeout = setTimeout(() => {
          const selectedPaths = canvasPaths.filter(p => p.isSelected);
          if (selectedPaths.length > 0 && client) {
            selectedPaths.forEach((path) => {
              const pathWithBoardId = {
                ...path,
                boardId: boardId,     // Thêm boardId
              };

              delete pathWithBoardId.isSelected; // Xóa thuộc tính isSelected trước khi gửi
            
              console.log("send update path", pathWithBoardId);
              client?.publish({
                destination: `/app/board/update-path/${boardId}`,  // Endpoint mới (singular)
                body: JSON.stringify(pathWithBoardId),
              });
            });
          }
        }, 500);
      } else {
        setSelectedPath([]);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setIsDrawing(false);
  };

  // Cleanup timer khi unmount
  useEffect(() => {
    return () => {
      if (moveUpdateTimeout) clearTimeout(moveUpdateTimeout);
    };
  }, []);

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
              isSelected={!!pathData.isSelected || false}
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
      {selectionBoundingBox && (
        <div
          className="absolute border-2 border-black border-dashed"
          style={{
            left: selectionBoundingBox.x * scale + translate.x,
            top: selectionBoundingBox.y * scale + translate.y,
            width: selectionBoundingBox.width * scale,
            height: selectionBoundingBox.height * scale,
            pointerEvents: 'none' // Không chặn sự kiện chuột
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