import BoardAPI from "@/api/BoardAPI";
import { useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import type { Client } from "@stomp/stompjs";
import { createSeqSync, type SeqSync } from "./seqSync";
import type { BatchEvent, BoardElement, ElementEvent, ElementPatch, HistoryResult } from "./types";

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
  patch(boardId: string, patches: ElementPatch[], opts?: { mergeKey?: string }) {
    if (!patches.length) return;
    // commit thay thế preview đang chờ của cùng id
    patches.forEach((p) => pendingPreview.delete(p.id));
    useSceneStore.getState().commitLocal(patches);
    const body: { patches: ElementPatch[]; mergeKey?: string } = { patches: patches.map(({ id, set }) => ({ id, set })) };
    // mergeKey ở top-level: server gộp các lần gõ liên tiếp (< 3s) vào cùng một tx
    if (opts?.mergeKey) body.mergeKey = opts.mergeKey;
    publish(boardId, "patch", body);
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
  // undo/redo/restore không áp lạc quan: kết quả tới qua batch + /user/queue/history
  undo(boardId: string) {
    publish(boardId, "undo", {});
  },
  redo(boardId: string) {
    publish(boardId, "redo", {});
  },
  restore(boardId: string, seq: number) {
    publish(boardId, "restore", { seq });
  },
};

// Đồng bộ seq của batch: một SeqSync cho board đang subscribe
let sync: SeqSync | null = null;
let syncBoardId: string | null = null;
let baseline: { boardId: string; seq: number } | null = null;
let reloadDepth = 0;
let held: BatchEvent[] = [];

function readySync(): SeqSync | null {
  return sync && reloadDepth === 0 && baseline?.boardId === syncBoardId ? sync : null;
}

// Chưa có baseline của board hoặc đang tải lại: giữ batch, áp sau khi reset store
function routeBatch(ev: BatchEvent) {
  const s = readySync();
  if (s) s.onBatch(ev);
  else held.push(ev);
}

function releaseHeld() {
  const s = readySync();
  if (!s) return;
  const evs = held;
  held = [];
  evs.forEach((ev) => s.onBatch(ev));
}

// Bỏ baseline cũ (vào lại board): giữ batch cho tới khi setSceneBaseline sau lần fetch mới
export function invalidateSceneBaseline(): void {
  baseline = null;
}

export function setSceneBaseline(seq: number) {
  const boardId = useSceneStore.getState().boardId;
  if (!boardId) return;
  baseline = { boardId, seq };
  if (sync && syncBoardId === boardId) sync.setBaseline(seq);
  releaseHeld();
}

export function subscribeScene(
  client: Client,
  boardId: string,
  sessionId: string,
  onError: () => void,
  onHistory?: (r: HistoryResult) => void
) {
  const own = createSeqSync({
    apply: (ev) => useSceneStore.getState().applyBatch(ev, sessionId),
    reload: () => loadBoard(boardId),
  });
  sync?.dispose();
  sync = own;
  syncBoardId = boardId;
  held = [];
  if (baseline?.boardId === boardId) own.setBaseline(baseline.seq);

  const elementSub = client.subscribe(`/topic/board/${boardId}/el`, (message) => {
    const event = JSON.parse(message.body) as ElementEvent | BatchEvent;
    if (event.op === "batch") routeBatch(event);
    else useSceneStore.getState().applyRemote(event, sessionId);
  });
  const errorSub = client.subscribe("/user/queue/errors", (message) => {
    console.error("Element error:", message.body);
    onError();
  });
  const historySub = client.subscribe("/user/queue/history", (message) => {
    onHistory?.(JSON.parse(message.body) as HistoryResult);
  });
  return () => {
    elementSub.unsubscribe();
    errorSub.unsubscribe();
    historySub.unsubscribe();
    if (sync === own) {
      // giữ seq đã áp để lần subscribe lại (reconnect) tiếp tục từ đó
      if (baseline?.boardId === boardId) baseline = { boardId, seq: own.lastSeq() };
      sync = null;
      syncBoardId = null;
      held = [];
    }
    own.dispose();
  };
}

// Tải board, reset store, đặt baseline = historySeq; ném lỗi để SeqSync thử lại
async function loadBoard(boardId: string): Promise<number> {
  reloadDepth += 1;
  try {
    const board = await BoardAPI.getBoardById(boardId);
    useBoardStoreof.getState().setBoard(board);
    useSceneStore.getState().reset(boardId, board.elements ?? []);
    useCanvasPathsStore.getState().setCanvasPaths(board.canvasPaths ?? []);
    const seq = board.historySeq ?? 0;
    setSceneBaseline(seq);
    return seq;
  } finally {
    reloadDepth -= 1;
    releaseHeld();
  }
}

// Tải lại toàn bộ board (khi server báo lỗi hoặc sau khi kết nối lại); null nếu lỗi
export async function reloadBoard(boardId: string): Promise<number | null> {
  try {
    return await loadBoard(boardId);
  } catch (e) {
    console.error("reload board error:", e);
    return null;
  }
}
