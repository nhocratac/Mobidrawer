import type { Client } from "@stomp/stompjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { invalidateSceneBaseline, reloadBoard, sceneSocket, setSceneBaseline, subscribeScene } from "../sceneSocket";
import type { BatchEvent, BoardElement, HistoryResult } from "../types";

const h = vi.hoisted(() => ({ publish: vi.fn(), getBoardById: vi.fn() }));

vi.mock("@/lib/Zustand/socketStore", () => ({
  useStompStore: { getState: () => ({ client: { connected: true, publish: h.publish } }) },
}));
vi.mock("@/api/BoardAPI", () => ({ default: { getBoardById: h.getBoardById } }));
vi.mock("@/lib/Zustand/store", () => ({ useBoardStoreof: { getState: () => ({ setBoard: () => {} }) } }));

const el = (id: string, extra: Partial<BoardElement> = {}): BoardElement => ({
  id, boardId: "b", type: "shape", x: 0, y: 0, w: 100, h: 100, rotation: 0, z: 0, version: 1,
  shape: { kind: "rect" }, ...extra,
});
const S = () => useSceneStore.getState();

const patchBatch = (seq: number, id: string, x: number, version = seq): BatchEvent => ({
  op: "batch", txId: `tx${seq}`, source: "user", seqFrom: seq, seqTo: seq, senderSessionId: "other", userId: "bob",
  ops: [{ op: "patch", patches: [{ id, set: { x }, version }] }],
});

function fakeClient() {
  const handlers = new Map<string, (m: { body: string }) => void>();
  const unsubscribed: string[] = [];
  const client = {
    subscribe: (dest: string, cb: (m: { body: string }) => void) => {
      handlers.set(dest, cb);
      return { unsubscribe: () => unsubscribed.push(dest) };
    },
  };
  return {
    client: client as unknown as Client,
    unsubscribed,
    send(dest: string, body: unknown) {
      const cb = handlers.get(dest);
      if (!cb) throw new Error(`no subscription for ${dest}`);
      cb({ body: JSON.stringify(body) });
    },
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const published = () =>
  h.publish.mock.calls.map(([arg]) => {
    const { destination, body } = arg as { destination: string; body: string };
    return [destination, JSON.parse(body)];
  });

let unsub: (() => void) | null = null;

afterEach(() => {
  unsub?.();
  unsub = null;
  h.publish.mockReset();
  h.getBoardById.mockReset();
});

describe("sceneSocket publish", () => {
  it("patch sends mergeKey top-level next to patches", () => {
    S().reset("b1", [el("a")]);
    sceneSocket.patch("b1", [{ id: "a", set: { text: "hi" }, version: 7 }], { mergeKey: "text:a:s1" });
    expect(published()).toEqual([
      ["/app/board/b1/el/patch", { patches: [{ id: "a", set: { text: "hi" } }], mergeKey: "text:a:s1" }],
    ]);
  });

  it("patch without opts sends no mergeKey", () => {
    S().reset("b1", [el("a")]);
    sceneSocket.patch("b1", [{ id: "a", set: { x: 3 } }]);
    const [[, body]] = published();
    expect(body).toEqual({ patches: [{ id: "a", set: { x: 3 } }] });
    expect("mergeKey" in body).toBe(false);
  });

  it("undo, redo and restore publish to el/undo, el/redo and el/restore", () => {
    sceneSocket.undo("b1");
    sceneSocket.redo("b1");
    sceneSocket.restore("b1", 12);
    expect(published()).toEqual([
      ["/app/board/b1/el/undo", {}],
      ["/app/board/b1/el/redo", {}],
      ["/app/board/b1/el/restore", { seq: 12 }],
    ]);
  });
});

describe("subscribeScene", () => {
  it("applies batches through seqSync after the baseline and drops duplicates", () => {
    S().reset("b2", [el("a")]);
    setSceneBaseline(10);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b2", "me", () => {});
    f.send("/topic/board/b2/el", patchBatch(11, "a", 5));
    expect(S().elements.a.x).toBe(5);
    f.send("/topic/board/b2/el", patchBatch(11, "a", 99, 50));
    expect(S().elements.a.x).toBe(5);
  });

  it("holds batches until a baseline for the subscribed board is known", () => {
    S().reset("b5", [el("a")]);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b5", "me", () => {});
    f.send("/topic/board/b5/el", patchBatch(21, "a", 4));
    expect(S().elements.a.x).toBe(0);
    setSceneBaseline(20);
    expect(S().elements.a.x).toBe(4);
  });

  it("non-batch element events still go through applyRemote", () => {
    S().reset("b6", [el("a")]);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b6", "me", () => {});
    f.send("/topic/board/b6/el", { op: "lock", senderSessionId: "other", userId: "bob", ids: ["a"] });
    expect(S().locks.a).toBe("bob");
  });

  it("history results go to onHistory", () => {
    S().reset("b7", []);
    const results: HistoryResult[] = [];
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b7", "me", () => {}, (r) => results.push(r));
    f.send("/user/queue/history", { op: "undo", applied: 0, skipped: [{ reason: "empty" }] });
    expect(results).toEqual([{ op: "undo", applied: 0, skipped: [{ reason: "empty" }] }]);
  });

  it("unsubscribe removes the element, error and history subscriptions", () => {
    S().reset("b8", []);
    const f = fakeClient();
    const stop = subscribeScene(f.client, "b8", "me", () => {});
    stop();
    expect([...f.unsubscribed].sort()).toEqual(["/topic/board/b8/el", "/user/queue/errors", "/user/queue/history"]);
  });

  it("reloadBoard sets the baseline from historySeq (Review Focus 2)", async () => {
    S().reset("b3", [el("a")]);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b3", "me", () => {});
    h.getBoardById.mockResolvedValue({ id: "b3", elements: [el("a", { boardId: "b3" })], canvasPaths: [], historySeq: 42 });
    await expect(reloadBoard("b3")).resolves.toBe(42);
    f.send("/topic/board/b3/el", patchBatch(42, "a", 99, 60));
    expect(S().elements.a.x).toBe(0);
    f.send("/topic/board/b3/el", patchBatch(43, "a", 7));
    expect(S().elements.a.x).toBe(7);
  });

  it("a contiguous batch that arrives while reloadBoard is in flight is applied after the reset", async () => {
    S().reset("b4", [el("a")]);
    setSceneBaseline(42);
    const f = fakeClient();
    unsub = subscribeScene(f.client, "b4", "me", () => {});
    const d = deferred<unknown>();
    h.getBoardById.mockReturnValue(d.promise);
    const p = reloadBoard("b4");
    f.send("/topic/board/b4/el", patchBatch(43, "a", 7));
    expect(S().elements.a.x).toBe(0);
    d.resolve({ id: "b4", elements: [el("a", { boardId: "b4" })], canvasPaths: [], historySeq: 42 });
    await expect(p).resolves.toBe(42);
    expect(S().elements.a.x).toBe(7);
  });

  it("re-entering a board after invalidateSceneBaseline holds batches until the new baseline", () => {
    S().reset("b10", [el("a")]);
    setSceneBaseline(5);
    const f1 = fakeClient();
    const stop = subscribeScene(f1.client, "b10", "me", () => {});
    stop();
    // như useBoard khi vào lại board: reset store rồi bỏ baseline cũ trước khi fetch
    S().reset("b10", [el("a")]);
    invalidateSceneBaseline();
    const f2 = fakeClient();
    unsub = subscribeScene(f2.client, "b10", "me", () => {});
    f2.send("/topic/board/b10/el", patchBatch(6, "a", 6));
    expect(S().elements.a.x).toBe(0);
    setSceneBaseline(7);
    expect(S().elements.a.x).toBe(0);
    f2.send("/topic/board/b10/el", patchBatch(8, "a", 8));
    expect(S().elements.a.x).toBe(8);
  });

  it("reloadBoard resolves null when the request fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.getBoardById.mockRejectedValue(new Error("network"));
    await expect(reloadBoard("b9")).resolves.toBeNull();
    spy.mockRestore();
  });
});
