"use client";

import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { sceneSocket } from "./sceneSocket";

// Thanh báo đang xem phiên bản cũ; chỉ OWNER được khôi phục
export default function HistoryBanner({ boardId }: { boardId: string }) {
  const mode = useSceneStore((s) => s.historyMode);
  const owner = useBoardStoreof((s) => s.board?.owner);
  const userId = useTokenStore((s) => s.user?.id);
  if (!mode) return null;
  const isOwner = !!userId && owner === userId;

  const restore = () => {
    sceneSocket.restore(boardId, mode.seq);
    useSceneStore.getState().exitHistory();
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-white shadow-lg border border-gray-300 rounded px-4 py-2 flex items-center gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">Đang xem phiên bản {mode.label}</span>
        <span className="text-xs text-gray-500">Nét vẽ không có lịch sử</span>
      </div>
      {isOwner && (
        <button onClick={restore} className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded">
          Khôi phục
        </button>
      )}
      <button
        onClick={() => useSceneStore.getState().exitHistory()}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm px-3 py-1 rounded"
      >
        Thoát
      </button>
    </div>
  );
}
