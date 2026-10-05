import { beforeEach, describe, expect, it } from "vitest";
import { selectDisplayedElements, selectDisplayedOrder, useSceneStore } from "@/lib/Zustand/sceneStore";
import type { BoardElement } from "../types";

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});
const S = () => useSceneStore.getState();
const MODE = { seq: 7, txId: "t7", label: "09:05 · Alice" };

beforeEach(() => {
  S().exitHistory();
  S().reset("b", [el("a", { z: 2 }), el("b", { z: 1 })]);
});

describe("sceneStore history mode", () => {
  it("starts live: selectors return the live elements and order", () => {
    expect(S().historyMode).toBeNull();
    expect(selectDisplayedElements(S())).toBe(S().elements);
    expect(selectDisplayedOrder(S())).toBe(S().order);
  });
  it("enterHistory clears selection and editingId", () => {
    S().setSelection(["a"]);
    S().setEditing("a");
    S().enterHistory(MODE, [el("x", { z: 5 })]);
    expect(S().historyMode).toEqual(MODE);
    expect(S().selection).toEqual([]);
    expect(S().editingId).toBeNull();
  });
  it("selectors switch to the history elements, ordered by z, and live state is untouched", () => {
    S().enterHistory(MODE, [el("x", { z: 5 }), el("y", { z: -1 })]);
    expect(Object.keys(selectDisplayedElements(S())).sort()).toEqual(["x", "y"]);
    expect(selectDisplayedOrder(S())).toEqual(["y", "x"]);
    expect(S().elements.a).toBeDefined();
    expect(S().order).toEqual(["b", "a"]);
  });
  it("history order breaks z ties by id like the live order", () => {
    S().enterHistory(MODE, [el("q", { z: 1 }), el("p", { z: 1 })]);
    expect(selectDisplayedOrder(S())).toEqual(["p", "q"]);
  });
  it("selectDisplayedOrder is referentially stable while in history (zustand selector safety)", () => {
    S().enterHistory(MODE, [el("x", { z: 5 }), el("y", { z: -1 })]);
    expect(selectDisplayedOrder(S())).toBe(selectDisplayedOrder(S()));
  });
  it("live store keeps receiving remote events while viewing history", () => {
    S().enterHistory(MODE, [el("x")]);
    S().applyRemote({ op: "patch", senderSessionId: "other", userId: "u", patches: [{ id: "a", set: { x: 50 }, version: 5 }] }, "me");
    expect(S().elements.a.x).toBe(50);
    expect(selectDisplayedElements(S()).a).toBeUndefined();
  });
  it("exitHistory clears history elements and selection, selectors return live again", () => {
    S().enterHistory(MODE, [el("x")]);
    S().setSelection(["x"]);
    S().exitHistory();
    expect(S().historyMode).toBeNull();
    expect(S().historyElements).toEqual({});
    expect(S().selection).toEqual([]);
    expect(selectDisplayedElements(S())).toBe(S().elements);
    expect(selectDisplayedOrder(S())).toBe(S().order);
  });
  it("reset of the same board (reloadBoard) keeps history mode", () => {
    S().enterHistory(MODE, [el("x")]);
    S().reset("b", [el("a")]);
    expect(S().historyMode).toEqual(MODE);
    expect(Object.keys(selectDisplayedElements(S()))).toEqual(["x"]);
  });
  it("reset for another board leaves history mode", () => {
    S().enterHistory(MODE, [el("x")]);
    S().reset("b2", []);
    expect(S().historyMode).toBeNull();
    expect(S().historyElements).toEqual({});
  });
  it("exitHistory then reset of the same board (re-entering a board) leaves no stale history", () => {
    S().enterHistory(MODE, [el("x")]);
    S().exitHistory();
    S().reset("b", []);
    expect(S().historyMode).toBeNull();
  });
});
