// src/lib/Zustand/canvasPathsStore.ts
import { canvasPath } from "@/lib/Zustand/type.type";
import { create } from "zustand";

export interface Point {
  x: number;
  y: number;
}

export interface CanvasPath {
  color: string;
  thickness: number;
  opacity: number;
  paths: Point[];
  isSelected?: boolean;
}

interface CanvasPathsState {
  canvasPaths: CanvasPath[];
  setCanvasPaths: (paths: CanvasPath[]) => void;
  addCanvasPath: (newPath: CanvasPath) => void;
  updateCanvasPath: (index: number, newPath: CanvasPath) => void;
  setSelectedPath: (selectedPaths: canvasPath[]) => void;
  addCanvasPaths: (
    x: number,
    y: number,
    penColor: string,
    penThickness: number,
    penOpacity: number
  ) => void;
  addPointToLastPath: (x: number, y: number) => void;
}

export const useCanvasPathsStore = create<CanvasPathsState>((set) => ({
  canvasPaths: [],
  setCanvasPaths: (paths) => set({ canvasPaths: paths }),
  addCanvasPath: (newPath) =>
    set((state) => ({ canvasPaths: [...state.canvasPaths, newPath] })),
  updateCanvasPath: (index, newPath) =>
    set((state) => {
      const updatedPaths = [...state.canvasPaths];
      if (index >= 0 && index < updatedPaths.length) {
        updatedPaths[index] = newPath;
      } else {
        console.warn("Index out of range");
      }
      return { canvasPaths: updatedPaths };
    }),
  setSelectedPath: (selectedPaths) =>
    set((prev) => {
      return {
        canvasPaths: prev.canvasPaths.map((paths) => ({
          ...paths,
          isSelected: selectedPaths.includes(paths),
        })),
      };
    }),
  // Hàm mới để thêm điểm vào đường vẽ cuối cùng hoặc tạo đường vẽ mới nếu cần
  addCanvasPaths: (x, y, penColor, penThickness, penOpacity) =>
    set((state) => {
        return {
            canvasPaths : [...state.canvasPaths,{
                paths:[{x,y}],
                color: penColor,
                thickness: penThickness,
                opacity: penOpacity
            }]
        }
    }),
  addPointToLastPath: (x, y) =>
    set((state) => {
      if (state.canvasPaths.length === 0) return state; // Tránh lỗi khi chưa có path nào

      const newPaths = [...state.canvasPaths];
      const lastPathIndex = newPaths.length - 1;
      const updatedLastPath = {
        ...newPaths[lastPathIndex],
        paths: [...newPaths[lastPathIndex].paths, { x, y }],
      };

      newPaths[lastPathIndex] = updatedLastPath;

      return { canvasPaths: newPaths };
    }),
}));