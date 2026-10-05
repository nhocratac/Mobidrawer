import BoardAPI from "@/api/BoardAPI";
import { stickyDtoToElement } from "@/components/Scene/legacyConvert";
import { invalidateSceneBaseline, sceneSocket, setSceneBaseline } from "@/components/Scene/sceneSocket";
import boardTemplateConfig from "@/config/boardTemplates";
import { useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import useUserInBoardStore from "@/lib/Zustand/userInBoardStore";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Status = 401 | 404 | 200;

export function useBoard() {
  const { id } = useParams();
  const isConnected = useStompStore((s) => s.isConnected);
  const [status, setStatus] = useState<Status>(200);
  const [loaded, setLoaded] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<number | null>(null);
  const setBoard = useBoardStoreof((state) => state.setBoard);
  const { setUsers } = useUserInBoardStore();

  useEffect(() => {
    if (!id) return;
    const boardId = id.toString();
    // reset() giữ historyMode khi cùng board: thoát trước để vào lại board không còn banner cũ
    useSceneStore.getState().exitHistory();
    // tránh hiện element của board trước khi chuyển board
    useSceneStore.getState().reset(boardId, []);
    // baseline cũ (lần vào board trước) đã lỗi thời: giữ batch cho tới khi có historySeq mới
    invalidateSceneBaseline();
    useCanvasPathsStore.getState().setCanvasPaths([]);
    setLoaded(false);
    BoardAPI.getBoardById(boardId)
      .then((res) => {
        setBoard(res);
        useSceneStore.getState().reset(boardId, res.elements ?? []);
        // lastSeq bắt đầu từ historySeq (server đọc trước elements) → batch cũ hơn bị bỏ, không reload thừa
        setSceneBaseline(res.historySeq ?? 0);
        useCanvasPathsStore.getState().setCanvasPaths(res.canvasPaths ?? []);
        setLoaded(true);

        // Board mới tạo từ template mẫu ở dashboard
        const templateIndex = localStorage.getItem("boardTemplateIndex");
        if (templateIndex !== null) {
          const index = parseInt(templateIndex, 10);
          if (index >= 0 && index < boardTemplateConfig.length) setPendingTemplate(index);
          localStorage.removeItem("boardTemplateIndex");
        }

        BoardAPI.getDetailMemberInBoard(boardId)
          .then((members) => setUsers(members))
          .catch(() => console.log("get board members error"));
      })
      .catch((e) => {
        if (e.response?.data?.message == "You are not allowed to access this board") {
          setStatus(401);
        } else if (e.status == 404 || e.response?.status == 404) {
          setStatus(404);
        } else console.log("get board by id error: ", e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Tạo sticky của template mẫu khi đã có kết nối socket (trước đây bị bỏ qua nếu socket chưa sẵn sàng)
  useEffect(() => {
    if (pendingTemplate === null || !loaded || !isConnected || !id) return;
    const boardId = id.toString();
    const base = useSceneStore.getState().topZ();
    const notes = boardTemplateConfig[pendingTemplate].map((note, i) => stickyDtoToElement(note, boardId, base + i + 1));
    sceneSocket.create(boardId, notes);
    setPendingTemplate(null);
  }, [pendingTemplate, loaded, isConnected, id]);

  const handleChangeRole = useCallback(
    async (memberId: string, role: "EDITOR" | "VIEWER") => {
      try {
        const res = await BoardAPI.changeRoleMember(id!.toString(), memberId, role);
        setBoard(res);
      } catch (error) {
        console.log(error);
      }
    },
    [id, setBoard]
  );

  return { id, status, handleChangeRole };
}
