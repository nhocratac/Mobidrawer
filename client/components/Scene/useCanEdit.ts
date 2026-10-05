import { useBoardStoreof } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";

// OWNER hoặc EDITOR mới được chỉnh sửa; VIEWER chỉ xem / pan / zoom
export function useCanEdit(): boolean {
  const board = useBoardStoreof((s) => s.board);
  const userId = useTokenStore((s) => s.user?.id);
  if (!board || !userId) return false;
  if (board.owner === userId) return true;
  return board.members?.some((m) => m.memberId === userId && m.role === "EDITOR") ?? false;
}
