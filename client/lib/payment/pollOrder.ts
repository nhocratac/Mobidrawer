import type { OrderStatus } from "@/api/paymentsAPI";

export type PollOutcome =
  | { kind: "paid"; order: OrderStatus }
  | { kind: "failed"; order: OrderStatus }
  | { kind: "timeout"; last: OrderStatus | null }
  | { kind: "error"; error: unknown };

export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  /** vnp_ResponseCode from the return URL; anything but "00" means VNPay already told the browser it failed. */
  urlResponseCode?: string | null;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Polls the ledger until it is terminal. The ledger (IPN) is the truth; the URL only shortens the wait on failure. */
export async function pollOrder(fetchOrder: () => Promise<OrderStatus>, opts: PollOptions): Promise<PollOutcome> {
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;
  const urlSaysFailed = opts.urlResponseCode != null && opts.urlResponseCode !== "00";
  const deadline = now() + opts.timeoutMs;
  let last: OrderStatus | null = null;
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      last = await fetchOrder();
    } catch (error) {
      if (attempt === 1) return { kind: "error", error };
    }
    if (last) {
      if (last.status === "PAID" && last.grantedUserPlanId) return { kind: "paid", order: last };
      if (last.status === "FAILED" || last.status === "EXPIRED") return { kind: "failed", order: last };
    }
    if (urlSaysFailed) return { kind: "timeout", last };
    if (now() >= deadline) return { kind: "timeout", last };
    await sleep(opts.intervalMs);
  }
}
