import { describe, expect, it } from "vitest";
import { elementsInRect, hitElement } from "../hitTest";
import type { BoardElement } from "../types";

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1, shape: { kind: "rect" }, ...extra,
});

describe("hitElement", () => {
  const els = {
    low: el("low", { z: 1 }),
    high: el("high", { x: 50, y: 50, z: 2 }),
    line: el("line", { x: 300, y: 0, w: 100, h: 0, shape: { kind: "line" }, z: 3 }),
    conn: el("conn", { type: "connector", shape: undefined, z: 4,
      connector: { from: { elementId: "low", anchor: "auto" }, to: { elementId: "line", anchor: "auto" } } }),
  };
  const order = ["low", "high", "line", "conn"];
  it("returns the topmost element", () => {
    expect(hitElement({ x: 60, y: 60 }, els, order, 1)).toBe("high");
    expect(hitElement({ x: 10, y: 10 }, els, order, 1)).toBe("low");
  });
  it("hits lines within screen tolerance", () => {
    const skip = { skipConnectors: true };
    expect(hitElement({ x: 350, y: 4 }, els, order, 1, skip)).toBe("line");
    expect(hitElement({ x: 350, y: 20 }, els, order, 1, skip)).toBeNull();
    expect(hitElement({ x: 350, y: 20 }, els, order, 0.25, { skipConnectors: true })).toBe("line");
  });
  it("can skip connectors", () => {
    expect(hitElement({ x: 200, y: 25 }, els, order, 1)).toBe("conn");
    expect(hitElement({ x: 200, y: 25 }, els, order, 1, { skipConnectors: true })).toBeNull();
  });
  it("can exclude ids", () => {
    expect(hitElement({ x: 60, y: 60 }, els, order, 1, { exclude: ["high"] })).toBe("low");
  });
});

describe("elementsInRect", () => {
  it("selects intersecting non-connector elements", () => {
    const els = { a: el("a"), b: el("b", { x: 500, y: 500 }), c: el("c", { type: "connector", shape: undefined,
      connector: { from: { elementId: "a", anchor: "auto" }, to: { elementId: "b", anchor: "auto" } } }) };
    expect(elementsInRect({ minX: 50, minY: 50, maxX: 200, maxY: 200 }, els)).toEqual(["a"]);
  });
});
