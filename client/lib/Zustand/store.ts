'use client'
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {} from "@redux-devtools/extension"; // required for devtools typing
import {
  BoardState,
  ListBoardState,
  ModeType,
  ToolDevState,
} from "@/lib/Zustand/type.type";

// Định nghĩa kiểu enum cho chế độ

// Định nghĩa trạng thái cho công cụ phát triển
const useBoardStore = create<ListBoardState>()(
  devtools(
    persist(
      (set, get) => ({
        boards: [],
        addnewBoard: (newBoard: BoardState) => {
          set((state) => ({
            boards: [...state.boards, newBoard], // Sử dụng state.boards để lấy mảng hiện tại
          }));
        },
        updateBoard: (newBoard: BoardState) => {
          set((state) => ({
            boards : state.boards.map((board) => (board.id === newBoard.id ? newBoard : board))
          }));
        }
      }),
      {
        name: "Boards-storage",
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          addnewBoard: currentState.addnewBoard,
        }),
      }
    )
  )
);
// Tạo store với Zustand
const useToolDevStore = create<ToolDevState>()(
  devtools(
    persist(
      (set, get) => ({
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

export { useToolDevStore, useBoardStore };
