import { describe, expect, it } from "vitest";
import { formatHistoryResult } from "../HistoryToast";

const names: Record<string, string> = { bob: "Bob Tran" };

describe("formatHistoryResult", () => {
  it("applied undo / redo / restore without skips", () => {
    expect(formatHistoryResult({ op: "undo", applied: 2, skipped: [] }, names)).toBe("Đã hoàn tác");
    expect(formatHistoryResult({ op: "redo", applied: 1, skipped: [] }, names)).toBe("Đã làm lại");
    expect(formatHistoryResult({ op: "restore", applied: 5, skipped: [] }, names)).toBe("Đã khôi phục phiên bản");
  });

  it("empty result per op", () => {
    const empty = [{ reason: "empty" as const }];
    expect(formatHistoryResult({ op: "undo", applied: 0, skipped: empty }, names)).toBe("Không còn gì để hoàn tác");
    expect(formatHistoryResult({ op: "redo", applied: 0, skipped: empty }, names)).toBe("Không còn gì để làm lại");
    expect(formatHistoryResult({ op: "restore", applied: 0, skipped: empty }, names)).toBe("Phiên bản này giống board hiện tại");
  });

  it("names the user who modified the key (spec §7.5 example 1)", () => {
    expect(
      formatHistoryResult(
        { op: "undo", applied: 0, skipped: [{ elementId: "s", key: "x", reason: "modified", byUserId: "bob" }] },
        names,
      ),
    ).toBe("1 thay đổi không hoàn tác được vì Bob Tran đã sửa");
  });

  it("partial apply lists done and skipped, deduplicating the reason", () => {
    expect(
      formatHistoryResult(
        {
          op: "undo",
          applied: 1,
          skipped: [
            { elementId: "s", key: "x", reason: "modified", byUserId: "bob" },
            { elementId: "s", key: "y", reason: "modified", byUserId: "bob" },
          ],
        },
        names,
      ),
    ).toBe("Đã hoàn tác. 2 thay đổi không hoàn tác được vì Bob Tran đã sửa");
  });

  it("unknown user and the other reasons", () => {
    expect(
      formatHistoryResult({ op: "redo", applied: 0, skipped: [{ key: "x", reason: "modified", byUserId: "zed" }] }, names),
    ).toBe("1 thay đổi không làm lại được vì người khác đã sửa");
    expect(
      formatHistoryResult({ op: "undo", applied: 0, skipped: [{ elementId: "c", key: "connector", reason: "end-missing" }] }, names),
    ).toBe("1 thay đổi không hoàn tác được vì điểm nối đã bị xóa");
    expect(
      formatHistoryResult(
        { op: "undo", applied: 0, skipped: [{ elementId: "e", reason: "gone" }, { elementId: "f", reason: "exists" }] },
        names,
      ),
    ).toBe("2 thay đổi không hoàn tác được vì phần tử đã bị xóa, phần tử đã tồn tại");
  });
});
