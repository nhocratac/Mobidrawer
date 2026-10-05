import { describe, expect, it } from "vitest";
import { canEditFrom } from "../useCanEdit";

const board = {
  owner: "o",
  members: [
    { memberId: "e", role: "EDITOR" as const },
    { memberId: "v", role: "VIEWER" as const },
  ],
};
const MODE = { seq: 3, txId: "t3", label: "10:00 · O" };

describe("canEditFrom", () => {
  it("owner and editor can edit, viewer and stranger cannot", () => {
    expect(canEditFrom(board, "o", null)).toBe(true);
    expect(canEditFrom(board, "e", null)).toBe(true);
    expect(canEditFrom(board, "v", null)).toBe(false);
    expect(canEditFrom(board, "x", null)).toBe(false);
  });
  it("no board or no user → false", () => {
    expect(canEditFrom(null, "o", null)).toBe(false);
    expect(canEditFrom(board, undefined, null)).toBe(false);
  });
  it("history mode makes everyone read-only, owner included", () => {
    expect(canEditFrom(board, "o", MODE)).toBe(false);
    expect(canEditFrom(board, "e", MODE)).toBe(false);
  });
});
