"use client";
import {
  BoardState,
  ItemProps,
  ListBoardState,
  ModeType,
  TemplateStoreState,
  ToolDevState,
} from "@/lib/Zustand/type.type";
import type { } from "@redux-devtools/extension";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// Định nghĩa trạng thái cho công cụ phát triển
const useBoardStore = create<ListBoardState>()(
  devtools(
    persist(
      (set) => ({
        boards: [],
        addnewBoard: (newBoard: BoardState) => {
          set((state) => ({
            boards: [...state.boards, newBoard], // Sử dụng state.boards để lấy mảng hiện tại
          }));
        },
        updateBoard: (newBoard: BoardState) => {
          set((state) => ({
            boards: state.boards.map((board) =>
              board.id === newBoard.id ? newBoard : board
            ),
          }));
        },
        setBoardColor: (id: number, color: string) => {
          set((state) => ({
            boards: state.boards.map((board) =>
              board.id == id
                ? {
                    ...board,
                    options: {
                      ...board.options,
                      backgroundColor: color,
                    },
                  }
                : board
            ),
          }));
        },
        setGridVisible: (id: number) => {
          set((state) => ({
            boards: state.boards.map((board) => {
              if (board.id == id) {
                return {
                  ...board,
                  options: {
                    ...board.options,
                    grid: !board.options.grid,
                  },
                };
              } else {
                return board;
              }
            }),
          }));
        },
        selectPath: (boardId: number, pathIndex: number) => {
          set((state) => ({
            boards: state.boards.map((board) =>
              board.id == boardId
                ? {
                  ...board,
                  canvasPaths: board.canvasPaths.map((path, index) => 
                    index === pathIndex
                      ? { ...path, isSelected: true}
                      : { ...path, isSelected: false}
                  ),
                } : board
            ),
          }));
        },
        deselectPath: (boardId: number) => {
          set((state) => ({
            boards: state.boards.map((board) =>
              board.id === boardId
              ? {
                  ...board,
                  canvasPaths: board.canvasPaths.map((path) => ({
                    ...path,
                    isSelected: false,
                  })),
                } : board
            ),
          }));
        },
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

const useTemplateStore = create<TemplateStoreState>()(
  devtools(
    persist(
      (set) => ({
        templates: [],
        addTemplate: (newTemplate: ItemProps) => {
          set((state) => ({
            templates: [...state.templates, newTemplate],
          }));
        },
        updateTemplate: (newTemplate: ItemProps) => {
          set((state) => ({
            templates: state.templates.map((template) =>
              template.id === newTemplate.id ? newTemplate : template
            ),
          }));
        },
        deleteTemplate: (id: string) => {
          set((state) => ({
            templates: state.templates.filter((template) => template.id !== id),
          }));
        },
      }),
      {
        name: "Templates-storage",
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          addnewTemplate: currentState.addTemplate,
          deleteTemplate: currentState.deleteTemplate,
          updateTemplate: currentState.updateTemplate,
        }),
      }
    )
  )
);
export { useBoardStore, useTemplateStore, useToolDevStore };

