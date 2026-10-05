import { describe, expect, it } from "vitest";
import { createSeqSync } from "../seqSync";
import type { BatchEvent } from "../types";

// Đồng hồ giả: timer chỉ chạy khi gọi advance
function fakeClock() {
  let now = 0;
  const timers: { at: number; fn: () => void; alive: boolean }[] = [];
  return {
    setTimer: (fn: () => void, ms: number): unknown => {
      const t = { at: now + ms, fn, alive: true };
      timers.push(t);
      return t;
    },
    clearTimer: (h: unknown) => {
      (h as { alive: boolean }).alive = false;
    },
    advance(ms: number) {
      now += ms;
      timers
        .filter((t) => t.alive && t.at <= now)
        .forEach((t) => {
          t.alive = false;
          t.fn();
        });
    },
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const ev = (seqFrom: number, seqTo = seqFrom, userId = "alice"): BatchEvent => ({
  op: "batch",
  txId: `tx${seqFrom}`,
  source: "user",
  seqFrom,
  seqTo,
  senderSessionId: `s-${userId}`,
  userId,
  ops: [],
});

// reloads: mỗi lần reload lấy promise kế tiếp trong danh sách (hết thì treo mãi)
function setup(reloads: Promise<number>[] = []) {
  const clock = fakeClock();
  const applied: number[] = [];
  let reloadCount = 0;
  const sync = createSeqSync({
    apply: (e) => applied.push(e.seqFrom),
    reload: () => reloads[reloadCount++] ?? new Promise<number>(() => {}),
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  return { sync, clock, applied, reloadCount: () => reloadCount };
}

describe("seqSync", () => {
  it("applies in-order batches and advances lastSeq", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(11));
    sync.onBatch(ev(12, 13));
    expect(applied).toEqual([11, 12]);
    expect(sync.lastSeq()).toBe(13);
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
  });

  it("ignores duplicate and stale batches", () => {
    const { sync, applied } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(11));
    sync.onBatch(ev(11));
    sync.onBatch(ev(5, 9));
    sync.onBatch(ev(10));
    expect(applied).toEqual([11]);
    expect(sync.lastSeq()).toBe(11);
  });

  it("gap filled within the wait window applies in seq order without reload", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    expect(applied).toEqual([]);
    expect(sync.lastSeq()).toBe(10);
    clock.advance(300);
    sync.onBatch(ev(11));
    expect(applied).toEqual([11, 12]);
    expect(sync.lastSeq()).toBe(12);
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
  });

  it("gap not filled triggers exactly one reload after 500 ms", () => {
    const { sync, clock, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(200);
    sync.onBatch(ev(13)); // không tiến triển → không khởi động lại timer
    clock.advance(299);
    expect(reloadCount()).toBe(0);
    clock.advance(1);
    expect(reloadCount()).toBe(1);
    expect(sync.isReloading()).toBe(true);
    clock.advance(5000);
    sync.onBatch(ev(14));
    expect(reloadCount()).toBe(1);
  });

  it("progress with a gap still open waits another 500 ms from the progress", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    sync.onBatch(ev(14));
    clock.advance(300);
    sync.onBatch(ev(11));
    expect(applied).toEqual([11, 12]);
    clock.advance(499);
    expect(reloadCount()).toBe(0);
    clock.advance(1);
    expect(reloadCount()).toBe(1);
  });

  it("buffers every batch during reload, drops seqTo <= historySeq and applies the rest in order", async () => {
    const d = deferred<number>();
    const { sync, clock, applied, reloadCount } = setup([d.promise]);
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(500);
    expect(reloadCount()).toBe(1);
    sync.onBatch(ev(14, 15));
    sync.onBatch(ev(11));
    sync.onBatch(ev(13));
    expect(applied).toEqual([]);
    d.resolve(12);
    await flush();
    expect(sync.isReloading()).toBe(false);
    expect(applied).toEqual([13, 14]);
    expect(sync.lastSeq()).toBe(15);
    clock.advance(1000);
    expect(reloadCount()).toBe(1);
  });

  it("restarts the wait after reload when a gap remains, then reloads once more", async () => {
    const d1 = deferred<number>();
    const { sync, clock, applied, reloadCount } = setup([d1.promise]);
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(500);
    sync.onBatch(ev(14));
    d1.resolve(12);
    await flush();
    expect(applied).toEqual([]);
    expect(sync.lastSeq()).toBe(12);
    clock.advance(499);
    expect(reloadCount()).toBe(1);
    clock.advance(1);
    expect(reloadCount()).toBe(2);
  });

  it("reload failure keeps lastSeq and retries after the wait", async () => {
    const d1 = deferred<number>();
    const { sync, clock, reloadCount } = setup([d1.promise]);
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    clock.advance(500);
    d1.reject(new Error("network"));
    await flush();
    expect(sync.isReloading()).toBe(false);
    expect(sync.lastSeq()).toBe(10);
    clock.advance(500);
    expect(reloadCount()).toBe(2);
  });

  it("interleaved commits of two users arriving out of order do not reload (Review Focus 1)", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    [ev(12, 12, "bob"), ev(11, 11, "alice"), ev(14, 14, "bob"), ev(13, 13, "alice"), ev(16, 17, "bob"), ev(15, 15, "alice")]
      .forEach((e) => {
        sync.onBatch(e);
        clock.advance(40);
      });
    expect(applied).toEqual([11, 12, 13, 14, 15, 16]);
    expect(sync.lastSeq()).toBe(17);
    clock.advance(2000);
    expect(reloadCount()).toBe(0);
  });

  it("a long interleaved stream whose buffer never empties for 660 ms does not reload (Review Focus 1)", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    [12, 14, 11, 16, 13, 18, 15, 20, 17, 22, 19, 21].forEach((s) => {
      sync.onBatch(ev(s, s, s % 2 ? "alice" : "bob"));
      clock.advance(60);
    });
    expect(applied).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
    expect(sync.lastSeq()).toBe(22);
    clock.advance(2000);
    expect(reloadCount()).toBe(0);
  });

  it("setBaseline drops buffered batches it already covers", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    sync.setBaseline(12);
    expect(applied).toEqual([]);
    expect(sync.lastSeq()).toBe(12);
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
    sync.onBatch(ev(13));
    expect(applied).toEqual([13]);
  });

  it("dispose cancels the pending gap timer and ignores later batches", () => {
    const { sync, clock, applied, reloadCount } = setup();
    sync.setBaseline(10);
    sync.onBatch(ev(12));
    sync.dispose();
    clock.advance(1000);
    expect(reloadCount()).toBe(0);
    sync.onBatch(ev(11));
    expect(applied).toEqual([]);
  });
});
