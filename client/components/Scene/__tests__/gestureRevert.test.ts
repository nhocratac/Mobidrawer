import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDragging, useSceneStore } from "@/lib/Zustand/sceneStore";
import { revertPatchesFor } from "../gestureRevert";
import { sceneSocket } from "../sceneSocket";
import type { BoardElement } from "../types";

const h = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock("@/lib/Zustand/socketStore", () => ({
  useStompStore: { getState: () => ({ client: { connected: true, publish: h.publish } }) },
}));
vi.mock("@/api/BoardAPI", () => ({ default: { getBoardById: vi.fn() } }));
vi.mock("@/lib/Zustand/store", () => ({ useBoardStoreof: { getState: () => ({ setBoard: () => {} }) } }));

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 10, y: 20, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});

beforeEach(() => {
  vi.useFakeTimers();
  h.publish.mockClear();
  setDragging([]);
  useSceneStore.getState().reset("b", [el("a")]);
});
afterEach(() => vi.useRealTimers());

const lastPreview = () => {
  const calls = h.publish.mock.calls.filter((c) => c[0].destination.endsWith("/preview"));
  return JSON.parse(calls[calls.length - 1][0].body).patches;
};

describe("revertPatchesFor + preview", () => {
  it("drag preview then cancel: store and last outbound preview carry original geometry", () => {
    const startEls = { a: el("a") };
    sceneSocket.preview("b", [{ id: "a", set: { x: 300, y: 400 } }]);
    expect(useSceneStore.getState().elements.a.x).toBe(300);

    const revert = revertPatchesFor({ mode: "dragging", moved: true, ids: ["a"], startEls });
    sceneSocket.preview("b", revert);
    vi.advanceTimersByTime(100);

    expect(useSceneStore.getState().elements.a).toMatchObject({ x: 10, y: 20 });
    expect(lastPreview()).toEqual([{ id: "a", set: { x: 10, y: 20 } }]);
  });

  it("covers resize and rotate keys, and is empty when nothing moved or mode has no preview", () => {
    const startEls = { a: el("a", { rotation: 15 }) };
    expect(revertPatchesFor({ mode: "resizing", moved: true, ids: ["a"], startEls })[0].set).toEqual({ x: 10, y: 20, w: 100, h: 100 });
    expect(revertPatchesFor({ mode: "rotating", moved: true, ids: ["a"], startEls })[0].set).toEqual({ rotation: 15 });
    expect(revertPatchesFor({ mode: "dragging", moved: false, ids: ["a"], startEls })).toEqual([]);
    expect(revertPatchesFor({ mode: "marquee", moved: true, ids: [], startEls: {} })).toEqual([]);
  });
});
