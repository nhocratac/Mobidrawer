import { describe, expect, it } from "vitest";
import { imageDtoToElement, remapIds, stickyDtoToElement } from "../legacyConvert";
import type { BoardElement } from "../types";

describe("legacyConvert", () => {
  it("sticky dto", () => {
    const e = stickyDtoToElement({ color: "bg-red-500", text: "a", size: { width: 200, height: 150 }, position: { x: 1, y: 2 } }, "b", 4);
    expect(e).toMatchObject({ type: "sticky", boardId: "b", x: 1, y: 2, w: 200, h: 150, text: "a", style: { fill: "bg-red-500" }, z: 4, rotation: 0 });
    expect(e.id).toMatch(/^[0-9a-f]{24}$/);
  });
  it("image dto with px strings", () => {
    const e = imageDtoToElement({ url: "u", alt: "a", cloudinaryId: "c", size: { width: "300px", height: 100 }, position: { x: 0, y: 0 } }, "b", 1);
    expect(e.w).toBe(300);
    expect(e.h).toBe(100);
    expect(e.image).toEqual({ url: "u", alt: "a", cloudinaryId: "c" });
  });
  it("image dto with bad size falls back to 200", () => {
    const e = imageDtoToElement({ url: "u", alt: "a", cloudinaryId: "c", size: { width: "auto", height: 0 }, position: { x: 0, y: 0 } }, "b", 1);
    expect(e.w).toBe(200);
    expect(e.h).toBe(200);
  });
  it("remapIds keeps connectors consistent and drops dangling ones", () => {
    const base = { boardId: "b", x: 0, y: 0, w: 10, h: 10, rotation: 0, z: 0, version: 1 };
    const input: BoardElement[] = [
      { ...base, id: "a", type: "shape", shape: { kind: "rect" } },
      { ...base, id: "b", type: "shape", shape: { kind: "rect" } },
      { ...base, id: "c", type: "connector", connector: { from: { elementId: "a", anchor: "auto" }, to: { elementId: "b", anchor: "left" } } },
      { ...base, id: "d", type: "connector", connector: { from: { elementId: "a", anchor: "auto" }, to: { elementId: "zz", anchor: "auto" } } },
    ];
    const out = remapIds(input, "board2");
    expect(out).toHaveLength(3);
    expect(out[0].id).not.toBe("a");
    expect(out.every((e) => e.boardId === "board2")).toBe(true);
    expect(out[2].connector!.from.elementId).toBe(out[0].id);
    expect(out[2].connector!.to).toEqual({ elementId: out[1].id, anchor: "left" });
    expect(input[0].id).toBe("a");
  });
});
