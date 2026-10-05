"use client";

import { toast } from "@/hooks/use-toast";
import useUserInBoardStore from "@/lib/Zustand/userInBoardStore";
import type { HistoryResult, HistorySkip } from "./types";

const TOAST_MS = 3000;

const DONE: Record<HistoryResult["op"], string> = {
  undo: "Đã hoàn tác",
  redo: "Đã làm lại",
  restore: "Đã khôi phục phiên bản",
};
const EMPTY: Record<HistoryResult["op"], string> = {
  undo: "Không còn gì để hoàn tác",
  redo: "Không còn gì để làm lại",
  restore: "Phiên bản này giống board hiện tại",
};
const VERB: Record<HistoryResult["op"], string> = { undo: "hoàn tác", redo: "làm lại", restore: "khôi phục" };

function reasonText(s: HistorySkip, userNameById: Record<string, string>): string {
  switch (s.reason) {
    case "modified":
      return `${(s.byUserId && userNameById[s.byUserId]) || "người khác"} đã sửa`;
    case "gone":
      return "phần tử đã bị xóa";
    case "exists":
      return "phần tử đã tồn tại";
    case "end-missing":
      return "điểm nối đã bị xóa";
    default:
      return "";
  }
}

export function formatHistoryResult(r: HistoryResult, userNameById: Record<string, string>): string {
  const skips = r.skipped.filter((s) => s.reason !== "empty");
  if (r.applied === 0 && skips.length === 0) return EMPTY[r.op];
  const parts: string[] = [];
  if (r.applied > 0) parts.push(DONE[r.op]);
  if (skips.length > 0) {
    const reasons = Array.from(new Set(skips.map((s) => reasonText(s, userNameById))));
    parts.push(`${skips.length} thay đổi không ${VERB[r.op]} được vì ${reasons.join(", ")}`);
  }
  return parts.join(". ");
}

// Toast kết quả undo/redo/restore qua <Toaster/> toàn cục (app/layout.tsx); tên lấy từ thành viên board
export function showHistoryToast(r: HistoryResult): void {
  const names: Record<string, string> = {};
  useUserInBoardStore.getState().users.forEach((u) => {
    names[u.userId] = `${u.firstName} ${u.lastName}`.trim();
  });
  toast({ description: formatHistoryResult(r, names), duration: TOAST_MS });
}
