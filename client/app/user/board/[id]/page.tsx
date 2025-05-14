'use client';
import BoardSubscription from '@/app/user/board/[id]/BoardSubscription';
import NotFoundBoard from '@/app/user/board/[id]/notfound';
import UnauthorizeBoard from '@/app/user/board/[id]/unauthorize';
import { useBoard } from '@/app/user/board/[id]/useBoard';
import ZoomableGrid from '@/components/BoardGrid/ZoomableGrid';
import RNDBase from "@/components/BoxResizable/RNDBase";
import RNDStickyNote from '@/components/BoxResizable/RNDStickyNote';
import RNDText from '@/components/BoxResizable/RNDText';
import LeftToolBar from '@/components/SideBar/LeftToolBar';
import TopRightBar from '@/components/SideBar/TopRightBar';
import AIChatButton from '@/components/ui/AIChatButton';
import useStickyNoteStore from '@/lib/Zustand/stickyNoteStore';
import { useEffect } from 'react';

const PlayGroundPage = () => {
  useEffect(() => {
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

  }, []);
  const {
    id,
    scale,
    status,
    setScaleHandle,
    textItemCount,
    setTextItemCount,
    onClickCreateStickyNote,
    shapeList,
    onClickAddShape,
    handleMoveStickyNote,
    handleReSizeStickyNote,
    handleChangeTextStickyNote,
    handleLockStickyNote,
    handleUnLockStickyNote,
    handleChangeRole,
    handleDeleteStickyNote,
    CreateManyStickyNotes
  } = useBoard();

  const { stickyNotes } = useStickyNoteStore();
  if (status == 401)
    return (
      <UnauthorizeBoard />
    )
  else if (status == 404) {
    return (
      <NotFoundBoard />
    )
  }
  return (
    <div className="w-screen h-screen bg-slate-500">
      {typeof id === 'string' &&
        (<>
          <BoardSubscription boardId={id.toString()} />
          <TopRightBar handleChangeRole={handleChangeRole} />
          <LeftToolBar
            onClickTextButton={() => setTextItemCount(textItemCount + 1)}
            onClickStickyNoteButton={onClickCreateStickyNote}
            onClickShape={onClickAddShape}
          />
          <AIChatButton boardId={id.toString()} CreateManyStickyNotes={CreateManyStickyNotes} />
          <ZoomableGrid onSetScale={setScaleHandle} boardId={id.toString()} >
            {Array.from({ length: textItemCount }).map((_, index) => (
              <RNDText key={index} parentScale={scale} />
            ))}
            {stickyNotes.map((stickyNote) => (
              <RNDStickyNote key={stickyNote.id} parentScale={scale}
                stickyNote={stickyNote}
                handlemoveStickyNote={handleMoveStickyNote}
                handleReSizeStickyNote={handleReSizeStickyNote}
                handleChangeTextStickyNote={handleChangeTextStickyNote}
                handleLockStickyNote={handleLockStickyNote}
                handleUnLockStickyNote={handleUnLockStickyNote}
                handleDeleteStickyNote={handleDeleteStickyNote}
              />
            ))}

            {shapeList.map((ShapeComponent, index) => (
              <RNDBase key={index} parentScale={scale}  >
                <ShapeComponent />
              </RNDBase>
            ))}
          </ZoomableGrid>
          (</>)}
    </div>
  );
};

export default PlayGroundPage;
