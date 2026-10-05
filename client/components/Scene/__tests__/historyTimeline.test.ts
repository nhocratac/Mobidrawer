import { describe, expect, it } from "vitest";
import type { TxView } from "@/api/historyApi";
import { formatHHmm, groupTimeline } from "../HistoryPanel";

const T0 = Date.UTC(2026, 8, 25, 2, 0, 0);
// offsetSec càng lớn càng mới; API trả seqTo giảm dần nên test truyền mới nhất trước
const tx = (seqTo: number, userId: string, offsetSec: number, extra: Partial<TxView> = {}): TxView => ({
  txId: `t${seqTo}`,
  userId,
  userName: userId.toUpperCase(),
  ts: new Date(T0 + offsetSec * 1000).toISOString(),
  source: "user",
  state: "active",
  summary: { created: 0, patched: 1, deleted: 0 },
  seqTo,
  ...extra,
});

describe("groupTimeline", () => {
  it("empty list → no groups", () => {
    expect(groupTimeline([])).toEqual([]);
  });
  it("groups consecutive txs of the same user within 2 minutes; head is the newest", () => {
    const g = groupTimeline([tx(5, "alice", 300), tx(4, "alice", 250), tx(3, "alice", 200)]);
    expect(g).toHaveLength(1);
    expect(g[0].head.txId).toBe("t5");
    expect(g[0].txs.map((t) => t.txId)).toEqual(["t5", "t4", "t3"]);
    expect(g[0].userName).toBe("ALICE");
  });
  it("the 2-minute window is measured between neighbours (sliding)", () => {
    const g = groupTimeline([tx(4, "alice", 400), tx(3, "alice", 300), tx(2, "alice", 200), tx(1, "alice", 100)]);
    expect(g).toHaveLength(1);
  });
  it("exactly 120s stays grouped, 121s splits", () => {
    expect(groupTimeline([tx(2, "alice", 300), tx(1, "alice", 180)])).toHaveLength(1);
    expect(groupTimeline([tx(2, "alice", 300), tx(1, "alice", 179)])).toHaveLength(2);
  });
  it("another user in between splits the run and is never merged across", () => {
    const g = groupTimeline([tx(3, "alice", 300), tx(2, "bob", 290), tx(1, "alice", 280)]);
    expect(g.map((x) => x.userId)).toEqual(["alice", "bob", "alice"]);
  });
  it("sums the summaries of the grouped txs", () => {
    const g = groupTimeline([
      tx(3, "alice", 300, { summary: { created: 1, patched: 0, deleted: 0 } }),
      tx(2, "alice", 290, { summary: { created: 0, patched: 2, deleted: 0 } }),
      tx(1, "alice", 280, { summary: { created: 0, patched: 0, deleted: 3 } }),
    ]);
    expect(g[0].summary).toEqual({ created: 1, patched: 2, deleted: 3 });
  });
  it("does not mutate the input summaries", () => {
    const first = tx(2, "alice", 300);
    groupTimeline([first, tx(1, "alice", 290)]);
    expect(first.summary).toEqual({ created: 0, patched: 1, deleted: 0 });
  });
  it("regrouping page1 + page2 merges a run that crosses the page boundary", () => {
    const page1 = [tx(10, "bob", 500), tx(9, "alice", 400)];
    const page2 = [tx(8, "alice", 350), tx(7, "bob", 100)];
    const g = groupTimeline([...page1, ...page2]);
    expect(g.map((x) => x.txs.length)).toEqual([1, 2, 1]);
  });
});

describe("formatHHmm", () => {
  it("formats local time as HH:mm with zero padding", () => {
    expect(formatHHmm(new Date(2026, 8, 25, 9, 5).toISOString())).toBe("09:05");
    expect(formatHHmm(new Date(2026, 8, 25, 23, 59).toISOString())).toBe("23:59");
  });
});
