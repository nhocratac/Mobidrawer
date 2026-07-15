// src/lib/Zustand/canvasPathsStore.ts
// import { canvasPath } from "@/lib/Zustand/type.type";
import { create } from "zustand";

export interface Point {
  x: number;
  y: number;
}

export interface CanvasPath {
  id?: string;
  color: string;
  thickness: number;
  opacity: number;
  paths: Point[];
  isSelected?: boolean;
  // Client-only fields (Sprint 2 realtime sync): never sent over the wire.
  localId?: string;
  ownerId?: string;
  unsynced?: boolean;
}

function generateLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface CanvasPathsState {
  canvasPaths: CanvasPath[];
  setCanvasPaths: (paths: CanvasPath[]) => void;
  addCanvasPath: (newPath: CanvasPath) => void;
  //updateCanvasPath: (index: number, newPath: CanvasPath) => void;
  setSelectedPath: (selectedPaths: CanvasPath[]) => void;
  addCanvasPaths: (
    x: number,
    y: number,
    penColor: string,
    penThickness: number,
    penOpacity: number,
    ownerId?: string
  ) => void;
  addPointToLastPath: (x: number, y: number) => void;
  deletePaths: (ids: string[]) => void;
  updatePaths: (updatedPaths: CanvasPath[]) => void;
  // Sprint 2 realtime sync: map a server-assigned id onto the path holding a
  // given localId (own-echo correlation), and set/clear the unsynced flag on
  // a batch of queued-but-not-yet-acked strokes identified by localId.
  assignServerId: (localId: string, serverId: string) => void;
  setPathsUnsynced: (localIds: string[], unsynced: boolean) => void;
  // Sprint 3 undo/redo actions (additive only; no existing action's
  // signature or behavior changes). readdPath re-adds a path removed by a
  // prior delete, STRIPPING its stale (pre-delete) server id and stamping a
  // fresh localId (reusing generateLocalId) + ownerId, and returns the
  // newly stamped object so the caller can pass it straight to
  // usePathSync's queueDraw (keeping the pending-echo FIFO in sync).
  // removePathsByIdentity / restorePathPoints resolve by id first, falling
  // back to localId (identity-based, unlike deletePaths/updatePaths which
  // are id-only).
  readdPath: (path: CanvasPath, ownerId?: string) => CanvasPath;
  removePathsByIdentity: (refs: string[]) => void;
  restorePathPoints: (
    updates: { ref: string; points: Point[] }[]
  ) => void;
}

export const useCanvasPathsStore = create<CanvasPathsState>((set) => ({
  canvasPaths: [],
  setCanvasPaths: (paths) => set({ canvasPaths: paths }),
  addCanvasPath: (newPath) =>
    set((state) => ({ canvasPaths: [...state.canvasPaths, newPath] })),
  // updateCanvasPath: (index, newPath) =>
  //   set((state) => {
  //     const updatedPaths = [...state.canvasPaths];
  //     if (index >= 0 && index < updatedPaths.length) {
  //       updatedPaths[index] = newPath;
  //     } else {
  //       console.warn("Index out of range");
  //     }
  //     return { canvasPaths: updatedPaths };
  //   }),
  setSelectedPath: (selectedPaths) =>
    set((prev) => ({
        canvasPaths: prev.canvasPaths.map((paths) => ({
          ...paths,
          isSelected: selectedPaths.some((selected) => selected.id === paths.id),
          })),
    })),
  // Hàm mới để thêm điểm vào đường vẽ cuối cùng hoặc tạo đường vẽ mới nếu cần
  addCanvasPaths: (x, y, penColor, penThickness, penOpacity, ownerId) =>
    set((state) => {
        return {
            canvasPaths : [...state.canvasPaths,{
                paths:[{x,y}],
                color: penColor,
                thickness: penThickness,
                opacity: penOpacity,
                localId: generateLocalId(),
                ownerId,
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
    deletePaths: (ids) =>
      set((state) => ({
        canvasPaths: state.canvasPaths.filter((path) => !ids.includes(path.id!)),
      })),
    updatePaths: (updatedPaths) => {
      set((state) => {
        const updatesMap = new Map(updatedPaths.map(p => [p.id, p]));

        const newPaths = state.canvasPaths.map(path =>
          updatesMap.get(path.id!) || path
        );

        return { canvasPaths: newPaths}
      })
    },
    assignServerId: (localId, serverId) =>
      set((state) => ({
        canvasPaths: state.canvasPaths.map((path) =>
          path.localId === localId
            ? { ...path, id: serverId, unsynced: false }
            : path
        ),
      })),
    setPathsUnsynced: (localIds, unsynced) =>
      set((state) => ({
        canvasPaths: state.canvasPaths.map((path) =>
          path.localId && localIds.includes(path.localId)
            ? { ...path, unsynced }
            : path
        ),
      })),
    readdPath: (path, ownerId) => {
      const { id, localId, unsynced, ...rest } = path;
      void id;
      void localId;
      void unsynced;
      const newPath: CanvasPath = {
        ...rest,
        localId: generateLocalId(),
        ownerId,
      };
      set((state) => ({ canvasPaths: [...state.canvasPaths, newPath] }));
      return newPath;
    },
    removePathsByIdentity: (refs) =>
      set((state) => ({
        canvasPaths: state.canvasPaths.filter((path) => {
          const ref = path.id ?? path.localId;
          return !(ref && refs.includes(ref));
        }),
      })),
    restorePathPoints: (updates) =>
      set((state) => {
        const byRef = new Map(updates.map((u) => [u.ref, u.points]));
        return {
          canvasPaths: state.canvasPaths.map((path) => {
            const ref = path.id ?? path.localId;
            const points = ref ? byRef.get(ref) : undefined;
            return points ? { ...path, paths: points } : path;
          }),
        };
      }),
}));