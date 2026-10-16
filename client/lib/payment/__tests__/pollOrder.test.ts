import { describe, expect, it, vi } from "vitest";
import { pollOrder } from "../pollOrder";
import type { OrderStatus } from "@/api/paymentsAPI";

const order = (status: OrderStatus["status"], granted = false): OrderStatus => ({
  txnRef: "T1", status, plan: "PRO", amountVnd: 400000, createdAt: "2026-10-15T09:30:00",
  grantedUserPlanId: granted ? "p1" : null,
});
const noSleep = () => Promise.resolve();

describe("pollOrder", () => {
  it("pending then paid+granted -> paid", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(order("PENDING")).mockResolvedValueOnce(order("PAID")).mockResolvedValueOnce(order("PAID", true));
    const r = await pollOrder(fetch, { intervalMs: 1, timeoutMs: 1000, sleep: noSleep });
    expect(r.kind).toBe("paid");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("failed/expired -> failed, stops polling", async () => {
    for (const s of ["FAILED", "EXPIRED"] as const) {
      const fetch = vi.fn().mockResolvedValue(order(s));
      const r = await pollOrder(fetch, { intervalMs: 1, timeoutMs: 1000, sleep: noSleep });
      expect(r.kind).toBe("failed");
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });

  it("stays pending until timeout -> timeout with last order", async () => {
    let now = 0;
    const fetch = vi.fn().mockResolvedValue(order("PENDING"));
    const sleep = async (ms: number) => { now += ms; };
    const r = await pollOrder(fetch, { intervalMs: 100, timeoutMs: 350, sleep, now: () => now });
    expect(r.kind).toBe("timeout");
    expect(r.kind === "timeout" && r.last?.status).toBe("PENDING");
    expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(fetch.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("first fetch error -> error; later errors are tolerated", async () => {
    const first = vi.fn().mockRejectedValue(new Error("401"));
    expect((await pollOrder(first, { intervalMs: 1, timeoutMs: 100, sleep: noSleep })).kind).toBe("error");
    const later = vi.fn().mockResolvedValueOnce(order("PENDING")).mockRejectedValueOnce(new Error("net")).mockResolvedValueOnce(order("PAID", true));
    expect((await pollOrder(later, { intervalMs: 1, timeoutMs: 1000, sleep: noSleep })).kind).toBe("paid");
  });

  it("urlFailure_stillReadsLedgerOnce", async () => {
    const fetch = vi.fn().mockResolvedValue(order("PENDING"));
    const r = await pollOrder(fetch, { intervalMs: 1, timeoutMs: 1000, sleep: noSleep, urlResponseCode: "24" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(r.kind).toBe("timeout");
  });

  it("ledgerPaid_beatsUrlFailure", async () => {
    const fetch = vi.fn().mockResolvedValue(order("PAID", true));
    const r = await pollOrder(fetch, { intervalMs: 1, timeoutMs: 1000, sleep: noSleep, urlResponseCode: "24" });
    expect(r.kind).toBe("paid");
  });
});
