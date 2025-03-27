'use client';
import BoardSubscription from '@/app/user/board/[id]/BoardSubscription';
import { useBoard } from '@/app/user/board/[id]/useBoard';
import ZoomableGrid from '@/components/BoardGrid/ZoomableGrid';
import RNDBase from "@/components/BoxResizable/RNDBase";
import RNDStickyNote from '@/components/BoxResizable/RNDStickyNote';
import RNDText from '@/components/BoxResizable/RNDText';
import LeftToolBar from '@/components/SideBar/LeftToolBar';
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
    setScaleHandle,
    textItemCount,
    setTextItemCount,
    onClickCreateStickyNote,
    shapeList,
    onClickAddShape,
    handleMoveStickyNote,
    handleReSizeStickyNote,
  } = useBoard();

  const { stickyNotes } = useStickyNoteStore();
  return (
    <div className="w-screen h-screen bg-slate-500">
      {id &&
        (<>
          <BoardSubscription boardId={id.toString()} />
          <LeftToolBar
            onClickTextButton={() => setTextItemCount(textItemCount + 1)}
            onClickStickyNoteButton={onClickCreateStickyNote}
            onClickShape={onClickAddShape}
          />
          <ZoomableGrid onSetScale={setScaleHandle} boardId={id.toString()} >
            {Array.from({ length: textItemCount }).map((_, index) => (
              <RNDText key={index} parentScale={scale} />
            ))}
            {stickyNotes.map((stickyNote, index) => (
              <RNDStickyNote key={stickyNote.id} parentScale={scale}
                stickyNote={stickyNote}
                handlemoveStickyNote={handleMoveStickyNote}
                handleReSizeStickyNote={handleReSizeStickyNote} />
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
