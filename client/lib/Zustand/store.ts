"use client";
import { DEFAULT_SHAPE_STYLE } from "@/components/Scene/shapeFactory";
import {
  BoardStore,
  ToolDevState,
  ToolType
} from "@/lib/Zustand/type.type";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";


// Tạo store với Zustand
const useToolDevStore = create<ToolDevState>()(
  devtools(
    persist(
      (set) => ({
        tool: "select" as ToolType,
        setTool: (tool: ToolType) => set({ tool }),
        stickyColor: "bg-yellow-200",
        setStickyColor: (stickyColor: string) => set({ stickyColor }),
        shapeStyle: { ...DEFAULT_SHAPE_STYLE },
        setShapeStyle: (style) => set((state) => ({ shapeStyle: { ...state.shapeStyle, ...style } })),
        pencil: {
          color: "black",
          thickness: 15,
          setColor: (color: string) => {
            set((state) => ({
              ...state,
              pencil: {
                ...state.pencil,
                color,
                setColor: state.pencil.setColor, // Giữ lại hàm setColor
                setThickness: state.pencil.setThickness, // Giữ lại hàm setThickness
                setOpacity: state.pencil.setOpacity,
              },
            }));
          },
          setThickness: (thickness: number) => {
            set((state) => ({
              ...state,
              pencil: {
                ...state.pencil,
                thickness,
                setColor: state.pencil.setColor, // Giữ lại hàm setColor
                setThickness: state.pencil.setThickness, // Giữ lại hàm setThickness
                setOpacity: state.pencil.setOpacity,
              },
            }));
          },
          setOpacity: (opacity: number) => {
            set((state) => ({
              ...state,
              pencil: {
                ...state.pencil,
                opacity,
                setColor: state.pencil.setColor, // Giữ lại hàm setColor
                setThickness: state.pencil.setThickness, // Giữ lại hàm setThickness
                setOpacity: state.pencil.setOpacity,
              },
            }));
          },
        },
      }),
      {
        name: "tool-dev-storage", // Tên lưu trữ trong localStorage
        version: 2,
        // v1 lưu `mode` (drag | idle | pen | ...); v2 dùng `tool`
        migrate: (persistedState: any, version) => {
          if (version < 2 && persistedState) {
            const legacy: Record<string, ToolType> = { drag: "hand", idle: "select", pen: "pen" };
            persistedState.tool = legacy[persistedState.mode] ?? "select";
            delete persistedState.mode;
          }
          return persistedState;
        },
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          setTool: currentState.setTool,
          setStickyColor: currentState.setStickyColor,
          setShapeStyle: currentState.setShapeStyle,
          pencil: {
            ...currentState.pencil,
            ...persistedState?.pencil,
            setColor: currentState.pencil.setColor, // Đảm bảo setColor không bị ghi đè
            setThickness: currentState.pencil.setThickness, // Đảm bảo setThickness không bị ghi đè
            setOpacity: currentState.pencil.setOpacity,
          },
        }),
      }
    )
  )
);


export const useBoardStoreof = create<BoardStore>((set) => ({
  board: null,

  setBoard: (board) => set({ board }),

  updateBoard: (updates) =>
    set((state) => ({
      board: state.board ? { ...state.board, ...updates } : null,
    })),
  clearBoard: () => set({ board: null }),
  setBoardColor: (color: string) => {
    set((state) => ({
      board: state.board
        ? {
            ...state.board,
            option: {
              ...state.board?.option,
              backgroundColor: color,
            },
          }
        : null,
    }));
  },
  setGridVisible: () => {
    set((state ) => ({
      board: state.board
      ? {
          ...state.board,
          option: {
            ...state.board?.option,
            grid: !state.board?.option.grid,
          },
        }
      : null,
    }))
  },
  setMembers: (members) => {
    set((state) => ({
      board: state.board ? { ...state.board, members } : null,
    }));
  },
}));

export {useToolDevStore };

