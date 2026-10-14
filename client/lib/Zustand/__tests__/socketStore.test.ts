import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mô phỏng @stomp/stompjs 7 Client._connect: beforeConnect -> (còn active?) -> webSocketFactory
// -> CONNECT với snapshot connectHeaders (StompHandler nhận bản copy lúc tạo) -> onConnect.
type Attempt = { authorization: string | undefined; socket: unknown };
type FakeStompClient = {
  active: boolean;
  connectHeaders: Record<string, string>;
  attempts: Attempt[];
  subscriptions: string[];
  published: { destination: string; body: string }[];
  beforeConnectCalls: number;
  settle: () => Promise<void>;
  dropAndReconnect: () => Promise<void>;
};
type FakeSock = { url: string };

const h = vi.hoisted(() => ({
  clients: [] as unknown[],
  socks: [] as unknown[],
  refreshAccessToken: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("@stomp/stompjs", () => {
  class FakeClient {
    active = false;
    connectHeaders: Record<string, string> = {};
    beforeConnect: () => void | Promise<void> = () => {};
    webSocketFactory?: () => unknown;
    onConnect?: (frame: unknown) => void;
    onWebSocketClose?: (evt: unknown) => void;
    attempts: Attempt[] = [];
    subscriptions: string[] = [];
    published: { destination: string; body: string }[] = [];
    beforeConnectCalls = 0;
    private settled: Promise<void> = Promise.resolve();
    constructor(conf: object) {
      Object.assign(this, conf);
      h.clients.push(this);
    }
    activate() {
      if (this.active) return;
      this.active = true;
      this.settled = this.connectOnce();
    }
    async deactivate() {
      this.active = false;
    }
    subscribe(destination: string) {
      this.subscriptions.push(destination);
      return { id: `sub-${this.subscriptions.length}`, unsubscribe() {} };
    }
    publish(p: { destination: string; body: string }) {
      this.published.push(p);
    }
    settle() {
      return this.settled;
    }
    // stompjs: rớt socket -> onWebSocketClose -> _schedule_reconnect -> _connect (beforeConnect chạy lại)
    async dropAndReconnect() {
      this.onWebSocketClose?.({});
      if (!this.active) return;
      this.settled = this.connectOnce();
      await this.settled;
    }
    private async connectOnce() {
      this.beforeConnectCalls += 1;
      await this.beforeConnect();
      if (!this.active) return;
      const socket = this.webSocketFactory?.();
      this.attempts.push({ authorization: this.connectHeaders.Authorization, socket });
      this.onConnect?.({});
    }
  }
  return { Client: FakeClient };
});

vi.mock("sockjs-client", () => {
  class FakeSockJS {
    constructor(public url: string) {
      h.socks.push(this);
    }
  }
  return { default: FakeSockJS };
});

vi.mock("@/api/authAPI", () => ({ refreshAccessToken: h.refreshAccessToken }));

import useTokenStore from "@/lib/Zustand/tokenStore";
import { useStompStore } from "@/lib/Zustand/socketStore";

// JWT giả: header.payload.sig, payload có exp (giây) và user.id = tag để phân biệt token
const jwt = (tag: string, expMs: number) =>
  `h.${btoa(JSON.stringify({ exp: Math.floor(expMs / 1000), user: { id: tag } }))}.s`;
const HOUR = 3_600_000;

const client = (i = 0) => h.clients[i] as FakeStompClient;
const socks = () => h.socks as FakeSock[];
const bearers = (c: FakeStompClient) => c.attempts.map((a) => a.authorization);
const S = () => useStompStore.getState();

async function connectAndSettle() {
  S().connect();
  await client(h.clients.length - 1).settle();
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  useTokenStore.setState({ token: "", user: null });
  useStompStore.setState({ client: null, isConnected: false, connectCount: 0, sessionId: null });
});

afterEach(() => {
  S().disconnect(); // cũng clear timer refresh ở module scope
  h.clients.length = 0;
  h.socks.length = 0;
  h.refreshAccessToken.mockReset();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("socketStore: token on CONNECT (M3)", () => {
  it("beforeConnect reads the current tokenStore token on activate and sends it as Bearer", async () => {
    const tokenA = jwt("A", Date.now() + HOUR);
    useTokenStore.setState({ token: tokenA });

    await connectAndSettle();

    const c = client();
    expect(c.beforeConnectCalls).toBe(1);
    expect(c.attempts).toHaveLength(1);
    expect(c.attempts[0].authorization).toBe(`Bearer ${tokenA}`);
    expect(h.refreshAccessToken).not.toHaveBeenCalled();
    expect(S().isConnected).toBe(true);
  });

  it("reconnect after the token changed carries the new token; the stale one is never reused", async () => {
    const tokenA = jwt("A", Date.now() + HOUR);
    const tokenB = jwt("B", Date.now() + 2 * HOUR);
    useTokenStore.setState({ token: tokenA });
    await connectAndSettle();
    const c = client();

    useTokenStore.getState().setToken(tokenB); // refresh ở nơi khác (axios interceptor) đổi token trong store
    await c.dropAndReconnect();

    expect(c.beforeConnectCalls).toBe(2);
    expect(bearers(c)).toEqual([`Bearer ${tokenA}`, `Bearer ${tokenB}`]);
    expect(bearers(c).slice(1)).not.toContain(`Bearer ${tokenA}`);
    expect(h.refreshAccessToken).not.toHaveBeenCalled();
  });

  it("every (re)connect opens a NEW SockJS instance and the URL carries no token", async () => {
    const tokenA = jwt("A", Date.now() + HOUR);
    useTokenStore.setState({ token: tokenA });
    await connectAndSettle();
    const c = client();
    await c.dropAndReconnect();

    expect(socks()).toHaveLength(2);
    expect(c.attempts[0].socket).toBe(socks()[0]);
    expect(c.attempts[1].socket).toBe(socks()[1]);
    expect(c.attempts[0].socket).not.toBe(c.attempts[1].socket);
    for (const s of socks()) {
      expect(s.url).toBe("http://localhost:8080/ws");
      expect(s.url).not.toMatch(/token=/);
      expect(s.url).not.toContain(tokenA);
    }
  });

  it("connectCount increments on every onConnect and the session resets on close (resubscribe contract)", async () => {
    useTokenStore.setState({ token: jwt("A", Date.now() + HOUR) });
    await connectAndSettle();
    const c = client();
    expect(S().connectCount).toBe(1);
    expect(c.subscriptions).toEqual(["/user/queue/session"]);
    expect(c.published).toEqual([{ destination: "/app/connect", body: "{}" }]);

    useStompStore.setState({ sessionId: "sess-1" });
    await c.dropAndReconnect();

    expect(S().connectCount).toBe(2);
    expect(S().isConnected).toBe(true);
    expect(S().sessionId).toBeNull(); // onWebSocketClose đặt lại để effect [client, sessionId] subscribe lại
    expect(c.subscriptions).toEqual(["/user/queue/session", "/user/queue/session"]);
  });

  it("beforeConnect refreshes an expired/near-expiry store token and connects with the refreshed one", async () => {
    const stale = jwt("stale", Date.now() + 30_000); // < TOKEN_REFRESH_MARGIN_MS (60s)
    const fresh = jwt("fresh", Date.now() + HOUR);
    useTokenStore.setState({ token: stale });
    h.refreshAccessToken.mockResolvedValue(fresh);

    await connectAndSettle();

    expect(h.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(bearers(client())).toEqual([`Bearer ${fresh}`]);
  });

  it("beforeConnect with no token and a failed refresh deactivates and never opens a socket", async () => {
    useTokenStore.setState({ token: "" });
    h.refreshAccessToken.mockResolvedValue(null);

    await connectAndSettle();

    const c = client();
    expect(h.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(c.active).toBe(false);
    expect(c.attempts).toHaveLength(0);
    expect(socks()).toHaveLength(0);
    expect(S().isConnected).toBe(false);
  });

  it("the proactive refresh timer reconnects before expiry using the refreshed token", async () => {
    vi.useFakeTimers();
    const now = Date.now();
    const tokenA = jwt("A", now + 120_000); // timer = exp - 60s margin = 60s
    const tokenB = jwt("B", now + HOUR);
    useTokenStore.setState({ token: tokenA });
    h.refreshAccessToken.mockResolvedValue(tokenB);
    await connectAndSettle();
    const c = client();
    expect(bearers(c)).toEqual([`Bearer ${tokenA}`]);

    await vi.advanceTimersByTimeAsync(60_000);
    await c.settle();

    expect(h.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(bearers(c)).toEqual([`Bearer ${tokenA}`, `Bearer ${tokenB}`]);
    expect(socks()).toHaveLength(2);
    expect(S().connectCount).toBe(2);
    expect(S().client).toBe(c);
  });

  it("connect is a no-op while a client is active; disconnect deactivates and resets state", async () => {
    useTokenStore.setState({ token: jwt("A", Date.now() + HOUR) });
    await connectAndSettle();
    const c = client();

    S().connect();
    expect(h.clients).toHaveLength(1);
    expect(S().client).toBe(c);

    S().disconnect();
    expect(c.active).toBe(false);
    expect(S().client).toBeNull();
    expect(S().isConnected).toBe(false);
    expect(S().sessionId).toBeNull();
  });
});
