import { describe, expect, it } from "vitest";
import { editLockPlan } from "../editLock";

describe("editLockPlan", () => {
  it("acquires and later releases a free element", () => {
    expect(editLockPlan(undefined, "me")).toEqual({ canEdit: true, acquire: true });
  });
  it("keeps a lock I already set by hand (does not release it after editing)", () => {
    expect(editLockPlan("me", "me")).toEqual({ canEdit: true, acquire: false });
  });
  it("blocks editing when someone else holds the lock", () => {
    expect(editLockPlan("other", "me")).toEqual({ canEdit: false, acquire: false });
  });
});
