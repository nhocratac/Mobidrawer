import type { Pt } from "./geometry";
import { BoardElement, ElementStyle, newObjectId, ShapeKind } from "./types";

export const DEFAULT_SHAPE_W = 160;
export const DEFAULT_SHAPE_H = 100;
const CLICK_THRESHOLD = 4;

export const DEFAULT_SHAPE_STYLE: ElementStyle = { fill: "#ffffff", stroke: "#111827", strokeWidth: 2 };

// Tạo shape từ thao tác kéo chuột từ a tới b
export function shapeFromDrag(kind: ShapeKind, a: Pt, b: Pt, shift: boolean, style: ElementStyle, boardId: string, z: number): BoardElement {
  const base = { id: newObjectId(), boardId, type: "shape" as const, rotation: 0, z, version: 0, style: { ...style }, shape: { kind } };
  const isClick = Math.abs(b.x - a.x) < CLICK_THRESHOLD && Math.abs(b.y - a.y) < CLICK_THRESHOLD;

  if (kind === "line" || kind === "arrow") {
    if (isClick) return { ...base, x: a.x, y: a.y, w: DEFAULT_SHAPE_W, h: 0 };
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    if (shift) {
      const len = Math.hypot(dx, dy);
      const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      dx = Math.cos(angle) * len;
      dy = Math.sin(angle) * len;
      if (Math.abs(dy) < 1e-9) dy = 0;
      if (Math.abs(dx) < 1e-9) dx = 0;
    }
    return { ...base, x: a.x, y: a.y, w: dx, h: dy };
  }

  if (isClick) return { ...base, x: a.x - DEFAULT_SHAPE_W / 2, y: a.y - DEFAULT_SHAPE_H / 2, w: DEFAULT_SHAPE_W, h: DEFAULT_SHAPE_H };
  let w = Math.abs(b.x - a.x);
  let h = Math.abs(b.y - a.y);
  if (shift) w = h = Math.max(w, h);
  const x = b.x < a.x ? a.x - w : a.x;
  const y = b.y < a.y ? a.y - h : a.y;
  return { ...base, x, y, w, h };
}

export function lineEndpoints(e: BoardElement): [Pt, Pt] {
  return [
    { x: e.x, y: e.y },
    { x: e.x + e.w, y: e.y + e.h },
  ];
}
