"use client";

import { HistoryAPI, TxView } from "@/api/historyApi";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { History, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HistorySource } from "./types";

const PAGE_SIZE = 30;
// tx liên tiếp của cùng user cách nhau ≤ 2 phút được gộp thành 1 dòng (chỉ ở UI)
const GROUP_WINDOW_MS = 2 * 60 * 1000;

const SOURCE_LABEL: Record<HistorySource, string> = {
  user: "Chỉnh sửa",
  undo: "Hoàn tác",
  redo: "Làm lại",
  restore: "Khôi phục",
  template: "Template",
};

export interface TimelineGroup {
  key: string;
  userId: string;
  userName: string;
  head: TxView; // tx mới nhất của nhóm; bấm dòng thì xem board tại head.seqTo
  txs: TxView[];
  summary: TxView["summary"];
}

// txs đã sắp seqTo giảm dần như API trả về
export function groupTimeline(txs: TxView[]): TimelineGroup[] {
  const groups: TimelineGroup[] = [];
  txs.forEach((tx) => {
    const g = groups[groups.length - 1];
    const prev = g?.txs[g.txs.length - 1];
    if (g && prev && prev.userId === tx.userId && Math.abs(Date.parse(prev.ts) - Date.parse(tx.ts)) <= GROUP_WINDOW_MS) {
      g.txs.push(tx);
      g.summary = {
        created: g.summary.created + tx.summary.created,
        patched: g.summary.patched + tx.summary.patched,
        deleted: g.summary.deleted + tx.summary.deleted,
      };
      return;
    }
    groups.push({ key: tx.txId, userId: tx.userId, userName: tx.userName, head: tx, txs: [tx], summary: { ...tx.summary } });
  });
  return groups;
}

const pad = (n: number) => String(n).padStart(2, "0");
export function formatHHmm(ts: string): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const summaryText = (s: TxView["summary"]) => {
  const parts = [s.created ? `+${s.created}` : "", s.patched ? `~${s.patched}` : "", s.deleted ? `−${s.deleted}` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
};

export default function HistoryPanel({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [txs, setTxs] = useState<TxView[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyMode = useSceneStore((s) => s.historyMode);
  const viewReq = useRef(0);

  const load = useCallback(
    async (beforeSeq?: number) => {
      setLoading(true);
      setError(null);
      try {
        const page = await HistoryAPI.list(boardId, beforeSeq, PAGE_SIZE);
        setTxs((prev) => (beforeSeq === undefined ? page : [...prev, ...page]));
        setHasMore(page.length === PAGE_SIZE);
      } catch (e) {
        console.error("load history error:", e);
        setError("Không tải được lịch sử");
      } finally {
        setLoading(false);
      }
    },
    [boardId]
  );

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const view = async (g: TimelineGroup) => {
    const req = ++viewReq.current;
    try {
      const st = await HistoryAPI.state(boardId, g.head.seqTo);
      // bấm nhiều dòng liên tiếp: chỉ áp kết quả của lần bấm cuối
      if (req !== viewReq.current) return;
      useSceneStore
        .getState()
        .enterHistory({ seq: st.seq, txId: g.head.txId, label: `${formatHHmm(g.head.ts)} · ${g.userName || "Unknown"}` }, st.elements);
    } catch (e) {
      console.error("load history state error:", e);
      setError("Không tải được phiên bản này");
    }
  };

  const groups = groupTimeline(txs);
  const oldest = txs[txs.length - 1];

  return (
    <>
      <button
        title="Lịch sử phiên bản"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-white text-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-100"
      >
        <History className="w-6 h-6" />
      </button>
      {open && (
        <aside className="fixed top-0 right-0 z-[60] h-full w-[320px] bg-white text-black shadow-xl border-l flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="font-semibold">Lịch sử phiên bản</span>
            <div className="flex items-center gap-2">
              <button className="text-xs text-blue-600 hover:underline disabled:opacity-50" disabled={loading} onClick={() => void load()}>
                Làm mới
              </button>
              <button title="Đóng" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.key}
                onClick={() => void view(g)}
                className={`w-full text-left px-3 py-2 border-b hover:bg-gray-100 ${historyMode?.seq === g.head.seqTo ? "bg-blue-50" : ""}`}
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{g.userName || "Unknown"}</span>
                  <span className="text-gray-500">{formatHHmm(g.head.ts)}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {SOURCE_LABEL[g.head.source] ?? g.head.source}
                  {g.txs.length > 1 ? ` · ${g.txs.length} thao tác` : ""} · {summaryText(g.summary)}
                </div>
              </button>
            ))}
            {!loading && !error && groups.length === 0 && <p className="p-3 text-sm text-gray-500">Chưa có lịch sử</p>}
            {error && <p className="p-3 text-sm text-red-600">{error}</p>}
            {hasMore && oldest && (
              <button
                className="w-full py-2 text-sm text-blue-600 hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
                onClick={() => void load(oldest.seqTo)}
              >
                {loading ? "Đang tải..." : "Tải thêm"}
              </button>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
