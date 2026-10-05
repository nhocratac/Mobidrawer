import { describe, expect, it } from "vitest";
import * as g from "../geometry";

const box = (x: number, y: number, w: number, h: number, rotation = 0) => ({ x, y, w, h, rotation });
const close = (a: g.Pt, b: g.Pt) => {
  expect(a.x).toBeCloseTo(b.x, 5);
  expect(a.y).toBeCloseTo(b.y, 5);
};

describe("viewport", () => {
  it("round-trips screen/world", () => {
    const v = { s: 2, tx: 10, ty: -20 };
    close(g.screenToWorld(g.worldToScreen({ x: 3, y: 4 }, v), v), { x: 3, y: 4 });
  });
  it("zoomAt keeps the world point under the cursor", () => {
    const v = { s: 1, tx: 0, ty: 0 };
    const p = { x: 200, y: 100 };
    const before = g.screenToWorld(p, v);
    const v2 = g.zoomAt(v, p, 1.1);
    close(g.screenToWorld(p, v2), before);
    expect(v2.s).toBeCloseTo(1.1);
  });
  it("zoomAt clamps", () => {
    expect(g.zoomAt({ s: 4.9, tx: 0, ty: 0 }, { x: 0, y: 0 }, 2).s).toBe(5);
    expect(g.zoomAt({ s: 0.11, tx: 0, ty: 0 }, { x: 0, y: 0 }, 0.5).s).toBe(0.1);
  });
});

describe("hit testing", () => {
  it("rotated box", () => {
    const b = box(0, 0, 100, 20, 90);
    expect(g.hitBox({ x: 50, y: 50 }, b)).toBe(true);
    expect(g.hitBox({ x: 5, y: 10 }, b)).toBe(false);
  });
  it("segment with tolerance", () => {
    expect(g.hitSegment({ x: 50, y: 3 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 4)).toBe(true);
    expect(g.hitSegment({ x: 50, y: 9 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 4)).toBe(false);
    expect(g.hitSegment({ x: 120, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }, 4)).toBe(false);
  });
  it("aabb of rotated box", () => {
    const a = g.aabb(box(0, 0, 100, 20, 90));
    expect(a.minX).toBeCloseTo(40);
    expect(a.maxX).toBeCloseTo(60);
    expect(a.minY).toBeCloseTo(-40);
    expect(a.maxY).toBeCloseTo(60);
  });
  it("normBox flips negative sizes", () => {
    expect(g.normBox(box(100, 100, -40, -30))).toMatchObject({ x: 60, y: 70, w: 40, h: 30 });
  });
  it("rectsIntersect", () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(g.rectsIntersect(a, { minX: 5, minY: 5, maxX: 20, maxY: 20 })).toBe(true);
    expect(g.rectsIntersect(a, { minX: 11, minY: 0, maxX: 20, maxY: 10 })).toBe(false);
  });
});

describe("resize", () => {
  it("se handle, unrotated, keeps nw corner", () => {
    expect(g.resizeBox(box(10, 10, 100, 100), "se", { x: 210, y: 160 }, false)).toMatchObject({ x: 10, y: 10, w: 200, h: 150 });
  });
  it("nw handle moves origin", () => {
    const r = g.resizeBox(box(10, 10, 100, 100), "nw", { x: 0, y: -10 }, false);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(-10);
    expect(r.w).toBeCloseTo(110);
    expect(r.h).toBeCloseTo(120);
  });
  it("enforces min size", () => {
    const r = g.resizeBox(box(10, 10, 100, 100), "se", { x: 0, y: 0 }, false);
    expect(r.w).toBe(g.MIN_SIZE);
    expect(r.h).toBe(g.MIN_SIZE);
  });
  it("rotated 90°: east handle grows w and keeps the west edge fixed in world", () => {
    const start = box(0, 0, 100, 20, 90);
    const westBefore = g.anchorPoint(start, "left");
    const eastWorld = g.anchorPoint(start, "right");
    const r = g.resizeBox(start, "e", { x: eastWorld.x, y: eastWorld.y + 50 }, false);
    expect(r.w).toBeCloseTo(150);
    expect(r.h).toBeCloseTo(20);
    close(g.anchorPoint(r, "left"), westBefore);
  });
  it("keepRatio", () => {
    const r = g.resizeBox(box(0, 0, 100, 50), "se", { x: 300, y: 60 }, true);
    expect(r.w / r.h).toBeCloseTo(2);
  });
});

describe("rotation", () => {
  it("pointer to the right of centre = 90°", () => {
    expect(g.rotationFromPointer(box(0, 0, 100, 100), { x: 200, y: 50 }, false)).toBeCloseTo(90);
  });
  it("pointer above centre = 0°", () => {
    expect(g.rotationFromPointer(box(0, 0, 100, 100), { x: 50, y: -100 }, false)).toBeCloseTo(0);
  });
  it("snaps to 15°", () => {
    expect(g.rotationFromPointer(box(0, 0, 100, 100), { x: 200, y: 45 }, true)).toBe(90);
  });
});

describe("connector geometry", () => {
  it("anchor points follow rotation", () => {
    close(g.anchorPoint(box(0, 0, 100, 50), "right"), { x: 100, y: 25 });
    close(g.anchorPoint(box(0, 0, 100, 50, 90), "right"), { x: 50, y: 75 });
  });
  it("auto uses rect boundary toward the other centre", () => {
    const [a, b] = g.connectorEndpoints(box(0, 0, 100, 100), "auto", box(300, 0, 100, 100), "auto");
    close(a, { x: 100, y: 50 });
    close(b, { x: 300, y: 50 });
  });
  it("auto on rotated rect", () => {
    const [a] = g.connectorEndpoints(box(0, 0, 200, 20, 90), "auto", box(80, 500, 40, 40), "auto");
    close(a, { x: 100, y: 110 });
  });
  it("explicit anchors", () => {
    const [a, b] = g.connectorEndpoints(box(0, 0, 100, 100), "bottom", box(300, 0, 100, 100), "top");
    close(a, { x: 50, y: 100 });
    close(b, { x: 350, y: 0 });
  });
  it("ellipse boundary", () => {
    close(g.boundaryPoint(box(0, 0, 200, 100), { x: 500, y: 50 }, "ellipse"), { x: 200, y: 50 });
    close(g.boundaryPoint(box(0, 0, 200, 100), { x: 100, y: 500 }, "ellipse"), { x: 100, y: 100 });
  });
  it("uses ellipse boundary for ellipse kind", () => {
    const [a] = g.connectorEndpoints({ ...box(0, 0, 100, 100), kind: "ellipse" }, "auto", box(300, 300, 100, 100), "auto");
    expect(Math.hypot(a.x - 50, a.y - 50)).toBeCloseTo(50);
  });
  it("nearestAnchor", () => {
    expect(g.nearestAnchor(box(0, 0, 100, 100), { x: 98, y: 52 }, 10)).toBe("right");
    expect(g.nearestAnchor(box(0, 0, 100, 100), { x: 50, y: 50 }, 10)).toBeNull();
  });
});

describe("triangle geometry", () => {
  const tri = { ...box(0, 0, 100, 100), kind: "triangle" };
  it("side anchors sit on the slanted edges", () => {
    close(g.anchorPoint(tri, "left"), { x: 25, y: 50 });
    close(g.anchorPoint(tri, "right"), { x: 75, y: 50 });
    close(g.anchorPoint(tri, "top"), { x: 50, y: 0 });
    close(g.anchorPoint(tri, "bottom"), { x: 50, y: 100 });
  });
  it("auto boundary hits the slanted edge", () => {
    const p = g.boundaryPoint(tri, { x: 500, y: 50 }, "triangle");
    close(p, { x: 75, y: 50 });
  });
  it("auto boundary hits the base", () => {
    close(g.boundaryPoint(tri, { x: 50, y: 500 }, "triangle"), { x: 50, y: 100 });
  });
  it("connectorEndpoints uses triangle boundary for triangle kind", () => {
    const [a] = g.connectorEndpoints(tri, "auto", box(300, 0, 100, 100), "auto");
    close(a, { x: 75, y: 50 });
  });
  it("nearestAnchor respects triangle anchors", () => {
    expect(g.nearestAnchor(tri, { x: 27, y: 50 }, 5)).toBe("left");
    expect(g.nearestAnchor(tri, { x: 2, y: 50 }, 5)).toBeNull();
  });
});
