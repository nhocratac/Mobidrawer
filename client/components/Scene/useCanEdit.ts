import { SceneState, useSceneStore } from "@/lib/Zustand/sceneStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";
import type { Board } from "@/lib/Zustand/type.type";

// OWNER hoặc EDITOR mới được chỉnh sửa; VIEWER chỉ xem / pan / zoom; đang xem lịch sử thì ai cũng chỉ xem
export function canEditFrom(
  board: Pick<Board, "owner" | "members"> | null,
  userId: string | undefined,
  historyMode: SceneState["historyMode"]
): boolean {
  if (historyMode) return false;
  if (!board || !userId) return false;
  if (board.owner === userId) return true;
  return board.members?.some((m) => m.memberId === userId && m.role === "EDITOR") ?? false;
}

export function useCanEdit(): boolean {
  const board = useBoardStoreof((s) => s.board);
  const userId = useTokenStore((s) => s.user?.id);
  const historyMode = useSceneStore((s) => s.historyMode);
  return canEditFrom(board, userId, historyMode);
}
