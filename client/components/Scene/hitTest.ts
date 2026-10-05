import { AABB, aabb, connectorEndpoints, hitBox, hitSegment, normBox, Pt, rectsIntersect } from "./geometry";
import type { BoardElement } from "./types";

export const HIT_TOLERANCE_PX = 6;

export const isLine = (e: BoardElement) => e.type === "shape" && (e.shape?.kind === "line" || e.shape?.kind === "arrow");

export function lineSegment(e: BoardElement): [Pt, Pt] {
  return [
    { x: e.x, y: e.y },
    { x: e.x + e.w, y: e.y + e.h },
  ];
}

const asTarget = (e: BoardElement) => ({ ...normBox(e), kind: e.shape?.kind });

// Hai đầu của connector suy ra từ vị trí hiện tại của 2 element; null nếu thiếu một đầu
export function connectorSegment(conn: BoardElement, elements: Record<string, BoardElement>): [Pt, Pt] | null {
  if (!conn.connector) return null;
  const from = elements[conn.connector.from.elementId];
  const to = elements[conn.connector.to.elementId];
  if (!from || !to) return null;
  return connectorEndpoints(asTarget(from), conn.connector.from.anchor, asTarget(to), conn.connector.to.anchor);
}

export function hitElement(
  p: Pt,
  elements: Record<string, BoardElement>,
  order: string[],
  scale: number,
  opts: { skipConnectors?: boolean; exclude?: string[] } = {}
): string | null {
  const tol = HIT_TOLERANCE_PX / scale;
  for (let i = order.length - 1; i >= 0; i--) {
    const e = elements[order[i]];
    if (!e || opts.exclude?.includes(e.id)) continue;
    if (e.type === "connector") {
      if (opts.skipConnectors) continue;
      const seg = connectorSegment(e, elements);
      if (seg && hitSegment(p, seg[0], seg[1], tol)) return e.id;
      continue;
    }
    if (isLine(e)) {
      const [a, b] = lineSegment(e);
      if (hitSegment(p, a, b, tol)) return e.id;
      continue;
    }
    if (hitBox(p, e)) return e.id;
  }
  return null;
}

export function elementsInRect(rect: AABB, elements: Record<string, BoardElement>): string[] {
  return Object.values(elements)
    .filter((e) => e.type !== "connector" && rectsIntersect(rect, aabb(e)))
    .map((e) => e.id);
}
