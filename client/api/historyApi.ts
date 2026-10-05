import type { BoardElement, HistorySource } from "@/components/Scene/types";
import httpRequest from "@/utils/httpRequest";

export interface TxView {
  txId: string;
  userId: string;
  userName: string;
  ts: string;
  source: HistorySource;
  state: string;
  summary: { created: number; patched: number; deleted: number };
  seqTo: number;
}

const DEFAULT_LIMIT = 30;

// Timeline mới nhất trước; beforeSeq để lấy trang cũ hơn
const list = async (boardId: string, beforeSeq?: number, limit: number = DEFAULT_LIMIT): Promise<TxView[]> => {
  const params: Record<string, number> = { limit };
  if (beforeSeq !== undefined) params.beforeSeq = beforeSeq;
  const res = await httpRequest.get(`/board/${boardId}/history`, { params });
  return res.data;
};

// Trạng thái board tại seq (chỉ xem)
const state = async (boardId: string, seq: number): Promise<{ seq: number; elements: BoardElement[] }> => {
  const res = await httpRequest.get(`/board/${boardId}/history/state`, { params: { seq } });
  return res.data;
};

export const HistoryAPI = { list, state };
