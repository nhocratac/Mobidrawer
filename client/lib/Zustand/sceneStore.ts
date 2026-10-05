import type { Viewport } from "@/components/Scene/geometry";
import type { BatchEvent, BoardElement, ElementEvent, ElementPatch } from "@/components/Scene/types";
import { create } from "zustand";

export interface SceneState {
  boardId: string | null;
  elements: Record<string, BoardElement>;
  order: string[];
  selection: string[];
  viewport: Viewport;
  editingId: string | null;
  locks: Record<string, string>;
  ghosts: BoardElement[];
  historyMode: null | { seq: number; txId: string; label: string };
  historyElements: Record<string, BoardElement>;
  reset: (boardId: string, elements: BoardElement[]) => void;
  upsertLocal: (els: BoardElement[]) => void;
  patchLocal: (patches: ElementPatch[]) => void;
  commitLocal: (patches: ElementPatch[]) => void;
  removeLocal: (ids: string[]) => void;
  applyRemote: (ev: ElementEvent, mySessionId: string | null) => void;
  applyBatch: (ev: BatchEvent, mySessionId: string | null) => void;
  setSelection: (ids: string[]) => void;
  setViewport: (v: Viewport) => void;
  setEditing: (id: string | null) => void;
  setGhosts: (ghosts: BoardElement[]) => void;
  enterHistory: (mode: { seq: number; txId: string; label: string }, elements: BoardElement[]) => void;
  exitHistory: () => void;
  topZ: () => number;
  bottomZ: () => number;
  connectorsOf: (id: string) => string[];
}

// Id đang được kéo ở client này: bỏ qua preview của người khác cho các id đó
let draggingIds = new Set<string>();
export function setDragging(ids: string[]) {
  draggingIds = new Set(ids);
}

// Last-writer-wins theo từng field: version server mới nhất đã áp cho (id, field),
// và số commit local của (id, field) đang chờ server xác nhận
type FieldMap = Map<string, Map<string, number>>;
let fieldVersions: FieldMap = new Map();
let pendingCommits: FieldMap = new Map();
let baseVersions = new Map<string, number>();

const getField = (m: FieldMap, id: string, field: string) => m.get(id)?.get(field);
const setField = (m: FieldMap, id: string, field: string, value: number) => {
  if (!m.has(id)) m.set(id, new Map());
  m.get(id)!.set(field, value);
};
const fieldVersion = (id: string, field: string) => getField(fieldVersions, id, field) ?? baseVersions.get(id) ?? 0;

const sortOrder = (elements: Record<string, BoardElement>) =>
  Object.values(elements)
    .sort((a, b) => a.z - b.z || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((e) => e.id);

const applySet = (e: BoardElement, set: ElementPatch["set"]): BoardElement => ({ ...e, ...set });

// Xoá id kèm mọi connector nối vào chúng
function withoutIds(elements: Record<string, BoardElement>, ids: string[]) {
  const drop = new Set(ids);
  Object.values(elements).forEach((e) => {
    if (e.type === "connector" && e.connector && (drop.has(e.connector.from.elementId) || drop.has(e.connector.to.elementId)))
      drop.add(e.id);
  });
  const next: Record<string, BoardElement> = {};
  Object.values(elements).forEach((e) => {
    if (!drop.has(e.id)) next[e.id] = e;
  });
  return { next, drop };
}

// Áp patch từ server theo last-writer-wins từng field; echo = xác nhận commit của chính session này
function applyServerPatches(
  state: SceneState,
  patches: ElementPatch[],
  echo: boolean
): Partial<Pick<SceneState, "elements" | "order">> {
  const elements = { ...state.elements };
  let zChanged = false;
  patches.forEach((p) => {
    const cur = elements[p.id];
    if (!cur) return;
    const version = p.version ?? cur.version;
    const next: BoardElement = { ...cur, version: Math.max(cur.version, version) };
    (Object.keys(p.set) as (keyof typeof p.set)[]).forEach((f) => {
      let apply = version > fieldVersion(p.id, f);
      if (apply) setField(fieldVersions, p.id, f, version);
      if (echo) {
        const pending = Math.max(0, (getField(pendingCommits, p.id, f) ?? 0) - 1);
        setField(pendingCommits, p.id, f, pending);
        // commit mới hơn của chính mình chưa được xác nhận → giữ giá trị local
        if (pending > 0) apply = false;
      }
      if (!apply) return;
      (next as unknown as Record<string, unknown>)[f] = p.set[f];
      if (f === "z") zChanged = true;
    });
    elements[p.id] = next;
  });
  return zChanged ? { elements, order: sortOrder(elements) } : { elements };
}

export const useSceneStore = create<SceneState>((set, get) => ({
  boardId: null,
  elements: {},
  order: [],
  selection: [],
  viewport: { s: 1, tx: 0, ty: 0 },
  editingId: null,
  locks: {},
  ghosts: [],
  historyMode: null,
  historyElements: {},

  reset: (boardId, els) => {
    const elements: Record<string, BoardElement> = {};
    els.forEach((e) => (elements[e.id] = e));
    fieldVersions = new Map();
    pendingCommits = new Map();
    baseVersions = new Map(els.map((e) => [e.id, e.version ?? 0]));
    // reloadBoard cùng board khi đang xem lịch sử thì giữ chế độ xem; đổi board thì thoát
    const leaveHistory = get().boardId !== boardId ? { historyMode: null, historyElements: {} } : {};
    set({ boardId, elements, order: sortOrder(elements), selection: [], editingId: null, locks: {}, ghosts: [], ...leaveHistory });
  },

  upsertLocal: (els) =>
    set((state) => {
      const elements = { ...state.elements };
      els.forEach((e) => {
        elements[e.id] = { ...elements[e.id], ...e };
        baseVersions.set(e.id, Math.max(baseVersions.get(e.id) ?? 0, e.version ?? 0));
      });
      return { elements, order: sortOrder(elements) };
    }),

  patchLocal: (patches) =>
    set((state) => {
      const elements = { ...state.elements };
      let zChanged = false;
      patches.forEach((p) => {
        const cur = elements[p.id];
        if (!cur) return;
        elements[p.id] = applySet(cur, p.set);
        if (p.set.z !== undefined) zChanged = true;
      });
      return zChanged ? { elements, order: sortOrder(elements) } : { elements };
    }),

  commitLocal: (patches) => {
    patches.forEach((p) =>
      Object.keys(p.set).forEach((f) => setField(pendingCommits, p.id, f, (getField(pendingCommits, p.id, f) ?? 0) + 1))
    );
    get().patchLocal(patches);
  },

  removeLocal: (ids) =>
    set((state) => {
      const { next, drop } = withoutIds(state.elements, ids);
      // id bị xoá có thể được tạo lại (undo/restore) với version thấp hơn → bỏ dấu version cũ
      drop.forEach((id) => {
        fieldVersions.delete(id);
        baseVersions.delete(id);
        pendingCommits.delete(id);
      });
      return {
        elements: next,
        order: state.order.filter((id) => !drop.has(id)),
        selection: state.selection.filter((id) => !drop.has(id)),
        editingId: state.editingId && drop.has(state.editingId) ? null : state.editingId,
      };
    }),

  applyRemote: (ev, mySessionId) => {
    const mine = ev.senderSessionId === mySessionId;
    switch (ev.op) {
      case "create":
        get().upsertLocal(ev.elements ?? []);
        break;
      case "patch":
        set((state) => applyServerPatches(state, ev.patches ?? [], mine));
        break;
      case "preview":
        if (mine) break;
        get().patchLocal((ev.patches ?? []).filter((p) => !draggingIds.has(p.id)));
        break;
      case "delete":
        get().removeLocal(ev.ids ?? []);
        break;
      case "lock":
        set((state) => {
          const locks = { ...state.locks };
          (ev.ids ?? []).forEach((id) => (locks[id] = ev.userId));
          return { locks };
        });
        break;
      case "unlock":
        set((state) => {
          const locks = { ...state.locks };
          (ev.ids ?? []).forEach((id) => delete locks[id]);
          return { locks };
        });
        break;
    }
  },

  applyBatch: (ev, mySessionId) => {
    // chỉ user/template đã được áp lạc quan ở local; undo/redo/restore luôn áp kể cả với người bấm
    const echo =
      mySessionId !== null && ev.senderSessionId === mySessionId && (ev.source === "user" || ev.source === "template");
    ev.ops.forEach((o) => {
      switch (o.op) {
        case "create":
          get().upsertLocal(o.elements);
          break;
        case "patch":
          set((state) => applyServerPatches(state, o.patches, echo));
          break;
        case "delete":
          get().removeLocal(o.ids);
          break;
      }
    });
  },

  setSelection: (ids) => set({ selection: ids }),
  setViewport: (viewport) => set({ viewport }),
  setEditing: (editingId) => set({ editingId }),
  setGhosts: (ghosts) => set({ ghosts }),

  enterHistory: (mode, els) => {
    const historyElements: Record<string, BoardElement> = {};
    els.forEach((e) => (historyElements[e.id] = e));
    // editingId = null làm TextEditOverlay unmount và nhả lock text đang giữ
    set({ historyMode: mode, historyElements, selection: [], editingId: null });
  },
  exitHistory: () => set({ historyMode: null, historyElements: {}, selection: [] }),

  topZ: () => {
    const { order, elements } = get();
    return order.length ? elements[order[order.length - 1]].z : 0;
  },
  bottomZ: () => {
    const { order, elements } = get();
    return order.length ? elements[order[0]].z : 0;
  },
  connectorsOf: (id) =>
    Object.values(get().elements)
      .filter((e) => e.type === "connector" && e.connector && (e.connector.from.elementId === id || e.connector.to.elementId === id))
      .map((e) => e.id),
}));

// Các component vẽ / hit-test đọc qua 2 selector này: đang xem lịch sử thì trả bản lịch sử
export const selectDisplayedElements = (s: SceneState): Record<string, BoardElement> =>
  s.historyMode ? s.historyElements : s.elements;

// Cache theo tham chiếu historyElements: selector của zustand phải trả mảng ổn định
let historyOrderCache: { src: Record<string, BoardElement>; order: string[] } | null = null;
export const selectDisplayedOrder = (s: SceneState): string[] => {
  if (!s.historyMode) return s.order;
  if (historyOrderCache?.src !== s.historyElements)
    historyOrderCache = { src: s.historyElements, order: sortOrder(s.historyElements) };
  return historyOrderCache.order;
};
