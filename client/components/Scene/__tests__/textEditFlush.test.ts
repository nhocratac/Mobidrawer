import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/Zustand/tokenStore", () => ({ default: () => undefined }));
vi.mock("../sceneSocket", () => ({ sceneSocket: {} }));

import { shouldFlushOnClose } from "../TextEditOverlay";

describe("shouldFlushOnClose", () => {
  it("flushes a pending, changed value on an existing element", () => {
    expect(shouldFlushOnClose(true, "abc", "ab", true)).toBe(true);
  });
  it("flushes the typed value even if the reloaded store text differs (reset case)", () => {
    const typed = "abc", storeAfterReset = "server text", lastSent = "ab";
    expect(shouldFlushOnClose(true, typed, lastSent, true)).toBe(true);
    expect(typed).not.toBe(storeAfterReset); // caller must send `typed`, never the store text
  });
  it("does not flush when nothing is pending, unchanged, or the element was deleted", () => {
    expect(shouldFlushOnClose(false, "abc", "ab", true)).toBe(false);
    expect(shouldFlushOnClose(true, "ab", "ab", true)).toBe(false);
    expect(shouldFlushOnClose(true, "abc", "ab", false)).toBe(false);
  });
});
