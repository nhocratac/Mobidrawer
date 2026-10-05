import { beforeEach, describe, expect, it } from "vitest";
import { setDragging, useSceneStore } from "@/lib/Zustand/sceneStore";
import type { BatchEvent, BatchOp, BoardElement, HistorySource } from "../types";

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});
const connector = (id: string, from: string, to: string, extra: Partial<BoardElement> = {}): BoardElement =>
  el(id, { type: "connector", shape: undefined, z: 3,
    connector: { from: { elementId: from, anchor: "auto" }, to: { elementId: to, anchor: "auto" } }, ...extra });
const S = () => useSceneStore.getState();

let seq = 0;
const batch = (source: HistorySource, senderSessionId: string | null, ops: BatchOp[]): BatchEvent => {
  seq += 1;
  return { op: "batch", txId: `tx${seq}`, source, seqFrom: seq, seqTo: seq, senderSessionId, userId: "u", ops };
};

beforeEach(() => {
  setDragging([]);
  seq = 0;
  S().reset("b", [el("a", { z: 2 }), el("b", { z: 1 }), connector("c", "a", "b")]);
});

describe("sceneStore.applyBatch", () => {
  it("applies ops in order: create, patch on the new element, delete with cascade", () => {
    S().applyBatch(batch("user", "other", [
      { op: "create", elements: [el("d", { z: 0.5 })] },
      { op: "patch", patches: [{ id: "d", set: { x: 9 }, version: 2 }] },
      { op: "delete", ids: ["b"] },
    ]), "me");
    expect(S().elements.d.x).toBe(9);
    expect(S().elements.d.version).toBe(2);
    expect(S().elements.b).toBeUndefined();
    expect(S().elements.c).toBeUndefined();
    expect(S().order).toEqual(["d", "a"]);
  });

  it("own user batch echo keeps a newer unacknowledged local value", () => {
    S().commitLocal([{ id: "a", set: { text: "Hel" } }]);
    S().commitLocal([{ id: "a", set: { text: "Hello" } }]);
    S().applyBatch(batch("user", "me", [{ op: "patch", patches: [{ id: "a", set: { text: "Hel" }, version: 2 }] }]), "me");
    expect(S().elements.a.text).toBe("Hello");
    expect(S().elements.a.version).toBe(2);
  });

  it("undo batch from my own session IS applied even with unacknowledged local commits", () => {
    S().commitLocal([{ id: "a", set: { x: 70 } }]);
    S().commitLocal([{ id: "a", set: { x: 80 } }]);
    S().applyBatch(batch("undo", "me", [{ op: "patch", patches: [{ id: "a", set: { x: 0 }, version: 3 }] }]), "me");
    expect(S().elements.a.x).toBe(0);
    expect(S().elements.a.version).toBe(3);
  });

  it("redo and restore batches from my own session are applied", () => {
    (["redo", "restore"] as const).forEach((source) => {
      S().reset("b", [el("a", { z: 2 })]);
      S().commitLocal([{ id: "a", set: { y: 70 } }]);
      S().commitLocal([{ id: "a", set: { y: 80 } }]);
      S().applyBatch(batch(source, "me", [{ op: "patch", patches: [{ id: "a", set: { y: 5 }, version: 4 }] }]), "me");
      expect(S().elements.a.y).toBe(5);
    });
  });

  it("template batch without a session is not treated as my echo", () => {
    S().commitLocal([{ id: "a", set: { x: 70 } }]);
    S().commitLocal([{ id: "a", set: { x: 80 } }]);
    S().applyBatch(batch("template", null, [{ op: "patch", patches: [{ id: "a", set: { x: 5 }, version: 2 }] }]), null);
    expect(S().elements.a.x).toBe(5);
  });

  it("undo-delete from my own session recreates the element", () => {
    S().removeLocal(["a"]);
    expect(S().elements.a).toBeUndefined();
    S().applyBatch(batch("undo", "me", [{ op: "create", elements: [el("a", { z: 2, x: 33, version: 3 })] }]), "me");
    expect(S().elements.a.x).toBe(33);
    expect(S().order).toEqual(["b", "a"]);
  });

  it("delete then recreate same id with lower version then patch applies", () => {
    S().applyBatch(batch("user", "other", [{ op: "patch", patches: [{ id: "a", set: { x: 50 }, version: 5 }] }]), "me");
    expect(S().elements.a.x).toBe(50);
    S().applyBatch(batch("user", "other", [{ op: "delete", ids: ["a"] }]), "me");
    S().applyBatch(batch("restore", "other", [{ op: "create", elements: [el("a", { z: 2, version: 2 })] }]), "me");
    expect(S().elements.a.x).toBe(0);
    expect(S().elements.a.version).toBe(2);
    S().applyBatch(batch("user", "other", [{ op: "patch", patches: [{ id: "a", set: { x: 77 }, version: 3 }] }]), "me");
    expect(S().elements.a.x).toBe(77);
    expect(S().elements.a.version).toBe(3);
  });

  it("removeLocal clears pending commits of cascaded connectors", () => {
    S().commitLocal([{ id: "c", set: { z: 9 } }]);
    S().commitLocal([{ id: "c", set: { z: 10 } }]);
    S().removeLocal(["a"]);
    expect(S().elements.c).toBeUndefined();
    S().applyBatch(batch("undo", "other", [{ op: "create", elements: [el("a", { z: 2, version: 2 }), connector("c", "a", "b", { version: 2 })] }]), "me");
    S().applyBatch(batch("user", "me", [{ op: "patch", patches: [{ id: "c", set: { z: 4 }, version: 3 }] }]), "me");
    expect(S().elements.c.z).toBe(4);
  });

  it("late patch for an element deleted locally is dropped silently (Review Focus 3)", () => {
    S().removeLocal(["a"]);
    expect(() =>
      S().applyBatch(batch("user", "other", [{ op: "patch", patches: [{ id: "a", set: { text: "late" }, version: 9 }] }]), "me"),
    ).not.toThrow();
    expect(S().elements.a).toBeUndefined();
  });
});
