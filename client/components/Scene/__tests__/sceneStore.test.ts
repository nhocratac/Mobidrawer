import { beforeEach, describe, expect, it } from "vitest";
import { setDragging, useSceneStore } from "@/lib/Zustand/sceneStore";
import type { BoardElement } from "../types";

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});
const S = () => useSceneStore.getState();

beforeEach(() => {
  setDragging([]);
  S().reset("b", [
    el("a", { z: 2 }),
    el("b", { z: 1 }),
    el("c", { type: "connector", shape: undefined, z: 3,
      connector: { from: { elementId: "a", anchor: "auto" }, to: { elementId: "b", anchor: "auto" } } }),
  ]);
});

describe("sceneStore", () => {
  it("orders by z", () => {
    expect(S().order).toEqual(["b", "a", "c"]);
  });
  it("ignores stale remote patch", () => {
    S().applyRemote({ op: "patch", senderSessionId: "other", userId: "u", patches: [{ id: "a", set: { x: 50 }, version: 5 }] }, "me");
    S().applyRemote({ op: "patch", senderSessionId: "other", userId: "u", patches: [{ id: "a", set: { x: 10 }, version: 4 }] }, "me");
    expect(S().elements.a.x).toBe(50);
    expect(S().elements.a.version).toBe(5);
  });
  it("own patch echo records version", () => {
    S().commitLocal([{ id: "a", set: { x: 70 } }]);
    S().applyRemote({ op: "patch", senderSessionId: "me", userId: "u", patches: [{ id: "a", set: { x: 70 }, version: 2 }] }, "me");
    expect(S().elements.a.x).toBe(70);
    expect(S().elements.a.version).toBe(2);
  });
  it("remote z patch re-orders", () => {
    S().applyRemote({ op: "patch", senderSessionId: "o", userId: "u", patches: [{ id: "b", set: { z: 10 }, version: 2 }] }, "me");
    expect(S().order).toEqual(["a", "c", "b"]);
  });
  it("preview from others applies unless I am dragging it", () => {
    S().applyRemote({ op: "preview", senderSessionId: "o", userId: "u", patches: [{ id: "a", set: { x: 5 } }] }, "me");
    expect(S().elements.a.x).toBe(5);
    setDragging(["a"]);
    S().applyRemote({ op: "preview", senderSessionId: "o", userId: "u", patches: [{ id: "a", set: { x: 9 } }] }, "me");
    expect(S().elements.a.x).toBe(5);
  });
  it("own preview echo ignored", () => {
    S().applyRemote({ op: "preview", senderSessionId: "me", userId: "u", patches: [{ id: "a", set: { x: 5 } }] }, "me");
    expect(S().elements.a.x).toBe(0);
  });
  it("remote create upserts and orders", () => {
    S().applyRemote({ op: "create", senderSessionId: "o", userId: "u", elements: [el("d", { z: 0.5 })] }, "me");
    expect(S().order).toEqual(["d", "b", "a", "c"]);
  });
  it("delete cascades connectors via reverse index", () => {
    S().applyRemote({ op: "delete", senderSessionId: "other", userId: "u", ids: ["a"] }, "me");
    expect(S().elements.a).toBeUndefined();
    expect(S().elements.c).toBeUndefined();
    expect(S().order).toEqual(["b"]);
  });
  it("connectorsOf", () => {
    expect(S().connectorsOf("b")).toEqual(["c"]);
    expect(S().connectorsOf("zzz")).toEqual([]);
  });
  it("removeLocal clears selection and editing of removed ids", () => {
    S().setSelection(["a", "b"]);
    S().setEditing("a");
    S().removeLocal(["a"]);
    expect(S().selection).toEqual(["b"]);
    expect(S().editingId).toBeNull();
  });
  it("lock/unlock", () => {
    S().applyRemote({ op: "lock", senderSessionId: "other", userId: "u2", ids: ["a"] }, "me");
    expect(S().locks.a).toBe("u2");
    S().applyRemote({ op: "unlock", senderSessionId: "other", userId: "u2", ids: ["a"] }, "me");
    expect(S().locks.a).toBeUndefined();
  });
  it("topZ / bottomZ", () => {
    expect(S().topZ()).toBe(3);
    expect(S().bottomZ()).toBe(1);
  });
  it("reset clears state for a new board", () => {
    S().setSelection(["a"]);
    S().reset("b2", []);
    expect(S().boardId).toBe("b2");
    expect(S().order).toEqual([]);
    expect(S().selection).toEqual([]);
    expect(S().topZ()).toBe(0);
  });
  it("own echo re-applies my value after a lower-version remote patch (server order: B v2, me v3)", () => {
    S().commitLocal([{ id: "a", set: { x: 70 } }]);
    S().applyRemote({ op: "patch", senderSessionId: "other", userId: "u", patches: [{ id: "a", set: { x: 5 }, version: 2 }] }, "me");
    expect(S().elements.a.x).toBe(5);
    S().applyRemote({ op: "patch", senderSessionId: "me", userId: "u", patches: [{ id: "a", set: { x: 70 }, version: 3 }] }, "me");
    expect(S().elements.a.x).toBe(70);
  });
  it("own echo does not revert a newer unacknowledged local commit of the same field", () => {
    S().commitLocal([{ id: "a", set: { text: "Hel" } }]);
    S().commitLocal([{ id: "a", set: { text: "Hello" } }]);
    S().applyRemote({ op: "patch", senderSessionId: "me", userId: "u", patches: [{ id: "a", set: { text: "Hel" }, version: 2 }] }, "me");
    expect(S().elements.a.text).toBe("Hello");
    S().applyRemote({ op: "patch", senderSessionId: "me", userId: "u", patches: [{ id: "a", set: { text: "Hello" }, version: 3 }] }, "me");
    expect(S().elements.a.text).toBe("Hello");
  });
  it("older patch on a different field still applies (per-field last-writer-wins)", () => {
    S().applyRemote({ op: "patch", senderSessionId: "o", userId: "u", patches: [{ id: "a", set: { text: "t" }, version: 6 }] }, "me");
    S().applyRemote({ op: "patch", senderSessionId: "o", userId: "u", patches: [{ id: "a", set: { x: 42 }, version: 5 }] }, "me");
    expect(S().elements.a.x).toBe(42);
    expect(S().elements.a.text).toBe("t");
    S().applyRemote({ op: "patch", senderSessionId: "o", userId: "u", patches: [{ id: "a", set: { text: "old" }, version: 4 }] }, "me");
    expect(S().elements.a.text).toBe("t");
  });
  it("reset clears pending local commits", () => {
    S().commitLocal([{ id: "a", set: { x: 1 } }]);
    S().reset("b", [el("a")]);
    S().applyRemote({ op: "patch", senderSessionId: "me", userId: "u", patches: [{ id: "a", set: { x: 9 }, version: 2 }] }, "me");
    expect(S().elements.a.x).toBe(9);
  });
});
