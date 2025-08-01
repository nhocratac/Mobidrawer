"use client";
import {
  BoardStore,
  ModeType,
  ToolDevState
} from "@/lib/Zustand/type.type";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";


// Tạo store với Zustand
const useToolDevStore = create<ToolDevState>()(
  devtools(
    persist(
      (set) => ({
        mode: ModeType.drag,
        setMode: (mode: ModeType) => {
          switch (mode) {
            case "drag":
              set({ mode: ModeType.drag });
              break;
            case "resize":
              set({ mode: ModeType.resize });
              break;
            case "rotate":
              set({ mode: ModeType.rotate });
              break;
            case "pen":
              set({ mode: ModeType.pen });
              break;
            case "eraser":
              set({ mode: ModeType.eraser });
              break;
            case "idle":
              set({ mode: ModeType.idle });
            default:
              break;
          }
        },
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
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          setMode: currentState.setMode,
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

