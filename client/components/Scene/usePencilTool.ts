import { CanvasPath, Point, useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useToolDevStore } from "@/lib/Zustand/store";
import { useCallback, useMemo, useRef } from "react";
import type { AABB } from "./geometry";

const MOVE_BROADCAST_INTERVAL = 500;

// Logic pencil chuyển từ ZoomableGrid: vẽ, chọn theo vùng, di chuyển, xoá. Giữ nguyên các destination STOMP cũ.
export function usePencilTool(boardId: string) {
  const canvasPaths = useCanvasPathsStore((s) => s.canvasPaths);
  const lastMoveBroadcast = useRef(0);

  const publish = (destination: string, body: unknown) => {
    const client = useStompStore.getState().client;
    if (!client?.connected) return;
    client.publish({ destination, body: JSON.stringify(body) });
  };

  const start = useCallback((p: Point) => {
    const pencil = useToolDevStore.getState().pencil;
    useCanvasPathsStore.getState().addCanvasPaths(p.x, p.y, pencil.color, pencil.thickness || 1, pencil.opacity || 1);
  }, []);

  const extend = useCallback((p: Point) => {
    useCanvasPathsStore.getState().addPointToLastPath(p.x, p.y);
  }, []);

  const end = useCallback(() => {
    const paths = useCanvasPathsStore.getState().canvasPaths;
    const last = paths[paths.length - 1];
    if (last && !last.id) publish(`/app/board/draw/${boardId}`, { ...last, boardId });
  }, [boardId]);

  const selectInRect = useCallback((r: AABB) => {
    const { canvasPaths: paths, setSelectedPath } = useCanvasPathsStore.getState();
    setSelectedPath(
      paths.filter((path) => path.paths?.some(({ x, y }) => x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY))
    );
  }, []);

  const clearSelection = useCallback(() => {
    const { canvasPaths: paths, setSelectedPath } = useCanvasPathsStore.getState();
    if (paths.some((p) => p.isSelected)) setSelectedPath([]);
  }, []);

  const hasSelection = useCallback(() => useCanvasPathsStore.getState().canvasPaths.some((p) => p.isSelected), []);

  const moveSelectedBy = useCallback(
    (dx: number, dy: number, immediate = false) => {
      const { canvasPaths: paths, setCanvasPaths } = useCanvasPathsStore.getState();
      const updated = paths.map((path) =>
        path.isSelected && path.paths ? { ...path, paths: path.paths.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) } : path
      );
      setCanvasPaths(updated);
      const now = Date.now();
      if (immediate || now - lastMoveBroadcast.current >= MOVE_BROADCAST_INTERVAL) {
        lastMoveBroadcast.current = now;
        publish(`/app/board/move-paths/${boardId}`, updated);
      }
    },
    [boardId]
  );

  const commitMove = useCallback(() => {
    const selected = useCanvasPathsStore.getState().canvasPaths.filter((p) => p.isSelected);
    if (!selected.length) return;
    const paths = selected.map((path) => ({ id: path.id, color: path.color, thickness: path.thickness, opacity: path.opacity, paths: path.paths, boardId }));
    publish(`/app/board/update-paths/${boardId}`, { paths });
  }, [boardId]);

  const deleteSelected = useCallback(() => {
    const { canvasPaths: paths, setCanvasPaths } = useCanvasPathsStore.getState();
    const ids = paths.filter((p) => p.isSelected).map((p) => p.id).filter(Boolean);
    if (!ids.length) return;
    publish(`/app/board/delete-paths/${boardId}`, ids);
    setCanvasPaths(paths.filter((p) => !p.isSelected));
  }, [boardId]);

  const selectionBox = useMemo(() => selectionBounds(canvasPaths), [canvasPaths]);

  return { canvasPaths, start, extend, end, selectInRect, clearSelection, hasSelection, moveSelectedBy, commitMove, deleteSelected, selectionBox };
}

export type PencilTool = ReturnType<typeof usePencilTool>;

function selectionBounds(paths: CanvasPath[]): AABB | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  paths.forEach((path) => {
    if (!path.isSelected) return;
    path.paths?.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
  });
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}
