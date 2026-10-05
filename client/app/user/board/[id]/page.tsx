'use client';
import BoardSubscription from '@/app/user/board/[id]/BoardSubscription';
import NotFoundBoard from '@/app/user/board/[id]/notfound';
import UnauthorizeBoard from '@/app/user/board/[id]/unauthorize';
import { useBoard } from '@/app/user/board/[id]/useBoard';
import BoardScene from '@/components/Scene/BoardScene';
import { imageDtoToElement, stickyDtoToElement } from '@/components/Scene/legacyConvert';
import HistoryBanner from '@/components/Scene/HistoryBanner';
import HistoryPanel from '@/components/Scene/HistoryPanel';
import { sceneSocket } from '@/components/Scene/sceneSocket';
import ConfirmSaveBar from '@/components/SideBar/ConfirmSaveBar';
import LeftToolBar from '@/components/SideBar/LeftToolBar';
import TopLeftBar from '@/components/SideBar/TopLeftBar';
import TopRightBar from '@/components/SideBar/TopRightBar';
import AIChatButton from '@/components/ui/AIChatButton';
import { useSceneStore } from '@/lib/Zustand/sceneStore';
import { useStompStore } from '@/lib/Zustand/socketStore';
import { useTempChangeStore } from '@/lib/Zustand/tempChangeStore';
import { useEffect } from 'react';

const PlayGroundPage = () => {
  useEffect(() => {
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
  }, []);
  const { id, status, handleChangeRole } = useBoard();
  const { stickyNotes: tempStickyNotes, imageNotes: tempImageNotes, canvasPaths: tempPaths, elements: tempElements } = useTempChangeStore();
  const boardId = typeof id === 'string' ? id : '';
  const historyMode = useSceneStore((s) => s.historyMode);

  // Bản xem trước (AI / import) hiển thị mờ trên scene cho tới khi bấm Save
  useEffect(() => {
    if (!boardId) return;
    const base = useSceneStore.getState().topZ();
    const ghosts = [
      ...(tempElements ?? []),
      ...(tempStickyNotes ?? []).map((n, i) => stickyDtoToElement(n, boardId, base + i + 1)),
      ...(tempImageNotes ?? []).map((n, i) => imageDtoToElement(n, boardId, base + (tempStickyNotes?.length ?? 0) + i + 1)),
    ];
    useSceneStore.getState().setGhosts(ghosts);
  }, [boardId, tempStickyNotes, tempImageNotes, tempElements]);

  const hasTemp = !!(tempStickyNotes?.length || tempImageNotes?.length || tempPaths?.length || tempElements?.length);

  const saveTemp = () => {
    // đang xem lịch sử thì không ghi bản xem trước AI / template
    if (useSceneStore.getState().historyMode) return;
    const ghosts = useSceneStore.getState().ghosts;
    sceneSocket.create(boardId, ghosts);
    const client = useStompStore.getState().client;
    (tempPaths ?? []).forEach((path) => {
      client?.publish({
        destination: `/app/board/draw/${boardId}`,
        body: JSON.stringify({ color: path.color, thickness: path.thickness, opacity: path.opacity, paths: path.paths, boardId }),
      });
    });
    useTempChangeStore.getState().clearTempChanges();
  };

  if (status == 401) return <UnauthorizeBoard />;
  if (status == 404) return <NotFoundBoard />;
  return (
    <div className="w-screen h-screen bg-slate-500">
      {boardId && (
        <>
          <BoardSubscription boardId={boardId} />
          <TopLeftBar />
          {hasTemp && !historyMode && (
            <ConfirmSaveBar onDiscard={() => useTempChangeStore.getState().clearTempChanges()} onSave={saveTemp} />
          )}
          <TopRightBar handleChangeRole={handleChangeRole} />
          <HistoryPanel boardId={boardId} />
          <HistoryBanner boardId={boardId} />
          <LeftToolBar boardId={boardId} />
          <AIChatButton boardId={boardId} />
          <BoardScene boardId={boardId} />
        </>
      )}
    </div>
  );
};

export default PlayGroundPage;
