import { describe, expect, it } from "vitest";
import { lineEndpoints, shapeFromDrag } from "../shapeFactory";

const st = { fill: "#fff", stroke: "#000", strokeWidth: 2 };

describe("shapeFromDrag", () => {
  it("normalizes reversed drag", () => {
    expect(shapeFromDrag("rect", { x: 100, y: 100 }, { x: 20, y: 40 }, false, st, "b", 1))
      .toMatchObject({ x: 20, y: 40, w: 80, h: 60, type: "shape", shape: { kind: "rect" }, z: 1, rotation: 0 });
  });
  it("shift makes square", () => {
    const e = shapeFromDrag("ellipse", { x: 0, y: 0 }, { x: 100, y: 40 }, true, st, "b", 1);
    expect(e.w).toBe(e.h);
  });
  it("click creates default size centred on the point", () => {
    expect(shapeFromDrag("triangle", { x: 10, y: 10 }, { x: 11, y: 11 }, false, st, "b", 1)).toMatchObject({ w: 160, h: 100, x: -70, y: -40 });
  });
  it("line keeps direction", () => {
    const e = shapeFromDrag("arrow", { x: 10, y: 10 }, { x: -40, y: 60 }, false, st, "b", 1);
    expect(lineEndpoints(e)).toEqual([{ x: 10, y: 10 }, { x: -40, y: 60 }]);
  });
  it("line snaps to 45° with shift", () => {
    const e = shapeFromDrag("line", { x: 10, y: 10 }, { x: 110, y: 20 }, true, st, "b", 1);
    const [a, b] = lineEndpoints(e);
    expect(a).toEqual({ x: 10, y: 10 });
    expect(b.y).toBeCloseTo(10);
    expect(b.x).toBeCloseTo(10 + Math.hypot(100, 10));
  });
  it("line click creates horizontal default", () => {
    const e = shapeFromDrag("line", { x: 0, y: 0 }, { x: 1, y: 1 }, false, st, "b", 1);
    expect(e).toMatchObject({ w: 160, h: 0 });
  });
  it("copies style and makes a new id", () => {
    const e = shapeFromDrag("rect", { x: 0, y: 0 }, { x: 100, y: 100 }, false, st, "b", 1);
    expect(e.style).toEqual(st);
    expect(e.style).not.toBe(st);
    expect(e.id).toMatch(/^[0-9a-f]{24}$/);
  });
});
