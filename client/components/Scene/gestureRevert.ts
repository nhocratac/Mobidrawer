import type { BoardElement, ElementPatch } from "./types";

const KEYS: Record<string, (keyof BoardElement)[]> = {
  dragging: ["x", "y"],
  resizing: ["x", "y", "w", "h"],
  lineEnd: ["x", "y", "w", "h"],
  rotating: ["rotation"],
};

// patch trả element về hình học trước gesture (Escape giữa chừng); rỗng nếu chưa kéo thật hoặc mode không có preview
export function revertPatchesFor(g: { mode: string; moved: boolean; ids: string[]; startEls: Record<string, BoardElement> }): ElementPatch[] {
  const keys = KEYS[g.mode];
  if (!keys || !g.moved) return [];
  return g.ids
    .filter((id) => g.startEls[id])
    .map((id) => {
      const set: Record<string, unknown> = {};
      keys.forEach((k) => (set[k] = g.startEls[id][k]));
      return { id, set };
    });
}
