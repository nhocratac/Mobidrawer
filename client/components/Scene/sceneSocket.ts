import BoardAPI from "@/api/BoardAPI";
import { useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import type { Client } from "@stomp/stompjs";
import type { BoardElement, ElementEvent, ElementPatch } from "./types";

const PREVIEW_INTERVAL = 50;

function publish(boardId: string, op: string, body: unknown) {
  const client = useStompStore.getState().client;
  if (!client?.connected) {
    console.warn("STOMP client chưa kết nối, bỏ qua", op);
    return;
  }
  client.publish({ destination: `/app/board/${boardId}/el/${op}`, body: JSON.stringify(body) });
}

// Gộp preview theo id rồi gửi tối đa mỗi PREVIEW_INTERVAL ms
let pendingPreview = new Map<string, ElementPatch>();
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let previewBoard: string | null = null;

function flushPreview() {
  previewTimer = null;
  if (!previewBoard || pendingPreview.size === 0) return;
  publish(previewBoard, "preview", { patches: Array.from(pendingPreview.values()) });
  pendingPreview = new Map();
}

export const sceneSocket = {
  create(boardId: string, elements: BoardElement[]) {
    if (!elements.length) return;
    useSceneStore.getState().upsertLocal(elements);
    publish(boardId, "create", { elements });
  },
  patch(boardId: string, patches: ElementPatch[]) {
    if (!patches.length) return;
    // commit thay thế preview đang chờ của cùng id
    patches.forEach((p) => pendingPreview.delete(p.id));
    useSceneStore.getState().commitLocal(patches);
    publish(boardId, "patch", { patches: patches.map(({ id, set }) => ({ id, set })) });
  },
  preview(boardId: string, patches: ElementPatch[]) {
    if (!patches.length) return;
    useSceneStore.getState().patchLocal(patches);
    previewBoard = boardId;
    patches.forEach((p) => {
      const prev = pendingPreview.get(p.id);
      pendingPreview.set(p.id, { id: p.id, set: { ...prev?.set, ...p.set } });
    });
    if (!previewTimer) previewTimer = setTimeout(flushPreview, PREVIEW_INTERVAL);
  },
  remove(boardId: string, ids: string[]) {
    if (!ids.length) return;
    useSceneStore.getState().removeLocal(ids);
    publish(boardId, "delete", { ids });
  },
  lock(boardId: string, id: string) {
    publish(boardId, "lock", { id });
  },
  unlock(boardId: string, id: string) {
    publish(boardId, "unlock", { id });
  },
};

export function subscribeScene(client: Client, boardId: string, sessionId: string, onError: () => void) {
  const elementSub = client.subscribe(`/topic/board/${boardId}/el`, (message) => {
    const event = JSON.parse(message.body) as ElementEvent;
    useSceneStore.getState().applyRemote(event, sessionId);
  });
  const errorSub = client.subscribe("/user/queue/errors", (message) => {
    console.error("Element error:", message.body);
    onError();
  });
  return () => {
    elementSub.unsubscribe();
    errorSub.unsubscribe();
  };
}

// Tải lại toàn bộ board (khi server báo lỗi hoặc sau khi kết nối lại)
export async function reloadBoard(boardId: string) {
  try {
    const board = await BoardAPI.getBoardById(boardId);
    useBoardStoreof.getState().setBoard(board);
    useSceneStore.getState().reset(boardId, board.elements ?? []);
    useCanvasPathsStore.getState().setCanvasPaths(board.canvasPaths ?? []);
  } catch (e) {
    console.error("reload board error:", e);
  }
}
