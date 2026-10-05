import type { Anchor, Side } from "./types";

export interface Pt {
  x: number;
  y: number;
}
export interface Viewport {
  s: number;
  tx: number;
  ty: number;
}
// Hộp chưa xoay (x,y là góc trên trái), xoay quanh tâm theo độ, chiều kim đồng hồ
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 5;
export const MIN_SIZE = 50;

const RAD = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function screenToWorld(p: Pt, v: Viewport): Pt {
  return { x: (p.x - v.tx) / v.s, y: (p.y - v.ty) / v.s };
}

export function worldToScreen(p: Pt, v: Viewport): Pt {
  return { x: p.x * v.s + v.tx, y: p.y * v.s + v.ty };
}

// Zoom giữ nguyên điểm world nằm dưới con trỏ
export function zoomAt(v: Viewport, p: Pt, factor: number): Viewport {
  const s = clamp(v.s * factor, MIN_SCALE, MAX_SCALE);
  const k = s / v.s;
  return { s, tx: p.x - (p.x - v.tx) * k, ty: p.y - (p.y - v.ty) * k };
}

export function center(e: Box): Pt {
  return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
}

export function rotatePt(p: Pt, c: Pt, deg: number): Pt {
  if (!deg) return { x: p.x, y: p.y };
  const cos = Math.cos(deg * RAD);
  const sin = Math.sin(deg * RAD);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

// world → toạ độ local của element (gốc ở góc trên trái, chưa xoay)
export function toLocal(p: Pt, e: Box): Pt {
  const r = rotatePt(p, center(e), -e.rotation);
  return { x: r.x - e.x, y: r.y - e.y };
}

export function fromLocal(p: Pt, e: Box): Pt {
  return rotatePt({ x: e.x + p.x, y: e.y + p.y }, center(e), e.rotation);
}

export function normBox<T extends Box>(e: T): T {
  const out = { ...e };
  if (out.w < 0) {
    out.x += out.w;
    out.w = -out.w;
  }
  if (out.h < 0) {
    out.y += out.h;
    out.h = -out.h;
  }
  return out;
}

export function aabb(e: Box): AABB {
  const b = normBox(e);
  const corners = [
    { x: 0, y: 0 },
    { x: b.w, y: 0 },
    { x: b.w, y: b.h },
    { x: 0, y: b.h },
  ].map((p) => fromLocal(p, b));
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxX: Math.max(...corners.map((p) => p.x)),
    maxY: Math.max(...corners.map((p) => p.y)),
  };
}

export function hitBox(p: Pt, e: Box, tol = 0): boolean {
  const b = normBox(e);
  const l = toLocal(p, b);
  return l.x >= -tol && l.x <= b.w + tol && l.y >= -tol && l.y <= b.h + tol;
}

export function hitSegment(p: Pt, a: Pt, b: Pt, tol: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) <= tol;
}

export function rectsIntersect(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

// Resize theo handle trong hệ local của hộp ban đầu; cạnh đối diện giữ cố định trong world
export function resizeBox(start: Box, handle: Handle, pointerWorld: Pt, keepRatio: boolean): Box {
  const lp = toLocal(pointerWorld, start);
  let left = 0;
  let top = 0;
  let right = start.w;
  let bottom = start.h;
  if (handle.includes("e")) right = lp.x;
  if (handle.includes("w")) left = lp.x;
  if (handle.includes("s")) bottom = lp.y;
  if (handle.includes("n")) top = lp.y;

  const movesX = handle.includes("e") || handle.includes("w");
  const movesY = handle.includes("n") || handle.includes("s");
  let w = movesX ? Math.max(MIN_SIZE, right - left) : start.w;
  let h = movesY ? Math.max(MIN_SIZE, bottom - top) : start.h;
  const corner = handle.length === 2;
  if (keepRatio && corner && start.w > 0 && start.h > 0) {
    const k = Math.max(w / start.w, h / start.h);
    w = Math.max(MIN_SIZE, start.w * k);
    h = Math.max(MIN_SIZE, start.h * k);
  }
  if (handle.includes("w")) left = right - w;
  else right = left + w;
  if (handle.includes("n")) top = bottom - h;
  else bottom = top + h;

  const c = fromLocal({ x: left + w / 2, y: top + h / 2 }, start);
  return { x: c.x - w / 2, y: c.y - h / 2, w, h, rotation: start.rotation };
}

// Góc xoay (độ) từ tâm tới con trỏ; 0 = handle thẳng phía trên
export function rotationFromPointer(e: Box, pointerWorld: Pt, snap: boolean): number {
  const c = center(e);
  let deg = Math.atan2(pointerWorld.x - c.x, -(pointerWorld.y - c.y)) / RAD;
  if (snap) deg = Math.round(deg / 15) * 15;
  deg = ((deg % 360) + 360) % 360;
  return deg;
}

// Hộp có thể kèm loại shape để điểm neo / biên khớp với hình thật (tam giác, ellipse)
export type Target = Box & { kind?: string };

const SIDE_LOCAL: Record<Side, (b: Box) => Pt> = {
  top: (b) => ({ x: b.w / 2, y: 0 }),
  right: (b) => ({ x: b.w, y: b.h / 2 }),
  bottom: (b) => ({ x: b.w / 2, y: b.h }),
  left: (b) => ({ x: 0, y: b.h / 2 }),
};

// Tam giác cân (đỉnh giữa cạnh trên): điểm neo trái/phải là trung điểm cạnh xiên
const TRIANGLE_SIDE_LOCAL: Record<Side, (b: Box) => Pt> = {
  ...SIDE_LOCAL,
  right: (b) => ({ x: (b.w * 3) / 4, y: b.h / 2 }),
  left: (b) => ({ x: b.w / 4, y: b.h / 2 }),
};

const triangleLocal = (b: Box): Pt[] => [
  { x: b.w / 2, y: 0 },
  { x: b.w, y: b.h },
  { x: 0, y: b.h },
];

export function anchorPoint(e: Target, anchor: Side): Pt {
  const b = normBox(e);
  const table = e.kind === "triangle" ? TRIANGLE_SIDE_LOCAL : SIDE_LOCAL;
  return fromLocal(table[anchor](b), b);
}

// t nhỏ nhất > 0 để tâm + t*dir chạm một cạnh của đa giác (hệ local)
function rayPolygon(c: Pt, dx: number, dy: number, poly: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-12) continue;
    const t = ((a.x - c.x) * ey - (a.y - c.y) * ex) / denom;
    const u = ((a.x - c.x) * dy - (a.y - c.y) * dx) / denom;
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
  }
  return best;
}

// Giao của tia từ tâm hướng tới `toward` với biên (chữ nhật, ellipse hoặc tam giác), có tính xoay
export function boundaryPoint(e: Box, toward: Pt, shape: "rect" | "ellipse" | "triangle"): Pt {
  const b = normBox(e);
  const l = toLocal(toward, b);
  const dx = l.x - b.w / 2;
  const dy = l.y - b.h / 2;
  if (dx === 0 && dy === 0) return center(b);
  const hw = b.w / 2;
  const hh = b.h / 2;
  let t: number;
  if (shape === "ellipse") {
    t = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
  } else if (shape === "triangle") {
    t = rayPolygon({ x: hw, y: hh }, dx, dy, triangleLocal(b));
    if (!Number.isFinite(t)) return center(b);
  } else {
    t = Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy));
  }
  return fromLocal({ x: hw + dx * t, y: hh + dy * t }, b);
}

const boundaryShape = (t: Target) => (t.kind === "ellipse" ? "ellipse" : t.kind === "triangle" ? "triangle" : "rect");

export function connectorEndpoints(from: Target, fromAnchor: Anchor, to: Target, toAnchor: Anchor): [Pt, Pt] {
  const fixedFrom = fromAnchor === "auto" ? null : anchorPoint(from, fromAnchor);
  const fixedTo = toAnchor === "auto" ? null : anchorPoint(to, toAnchor);
  const a = fixedFrom ?? boundaryPoint(from, fixedTo ?? center(normBox(to)), boundaryShape(from));
  const b = fixedTo ?? boundaryPoint(to, fixedFrom ?? center(normBox(from)), boundaryShape(to));
  return [a, b];
}

export function nearestAnchor(e: Target, p: Pt, maxDist: number): Side | null {
  let best: Side | null = null;
  let bestDist = maxDist;
  (Object.keys(SIDE_LOCAL) as Side[]).forEach((side) => {
    const a = anchorPoint(e, side);
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= bestDist) {
      bestDist = d;
      best = side;
    }
  });
  return best;
}
