'use client';
import BoardSubscription from '@/app/user/board/[id]/BoardSubscription';
import NotFoundBoard from '@/app/user/board/[id]/notfound';
import UnauthorizeBoard from '@/app/user/board/[id]/unauthorize';
import { useBoard } from '@/app/user/board/[id]/useBoard';
import ZoomableGrid from '@/components/BoardGrid/ZoomableGrid';
import RNDBase from "@/components/BoxResizable/RNDBase";
import RNDImageNote from '@/components/BoxResizable/RNDImageNote';
import RNDImageNoteTemp from '@/components/BoxResizable/RNDImageNoteTemp';
import RNDStickyNote from '@/components/BoxResizable/RNDStickyNote';
import RNDStickyNoteTemp from '@/components/BoxResizable/RNDStickyNoteTemp';
import RNDText from '@/components/BoxResizable/RNDText';
import ConfirmSaveBar from '@/components/SideBar/ConfirmSaveBar';
import LeftToolBar from '@/components/SideBar/LeftToolBar';
import TopLeftBar from '@/components/SideBar/TopLeftBar';
import TopRightBar from '@/components/SideBar/TopRightBar';
import AIChatButton from '@/components/ui/AIChatButton';
import { useImageNoteStore } from '@/lib/Zustand/ImageNoteStore';
import useStickyNoteStore from '@/lib/Zustand/stickyNoteStore';
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
  const {
    id,
    scale,
    status,
    setScaleHandle,
    textItemCount,
    // setTextItemCount,
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
    CreateManyStickyNotes,
    handleMoveImageNote,
    handleResizeImageNote,
    handleDeleteImageNote,
    handleAddImageNotes
  } = useBoard();

  const { stickyNotes } = useStickyNoteStore();
  const { stickyNotes: tempStickyNotes, imageNotes: tempImageNotes } = useTempChangeStore();
  const { imageNotes } = useImageNoteStore()
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
          <TopLeftBar />
          {(tempStickyNotes && tempStickyNotes.length > 0) &&
            <ConfirmSaveBar
              onDiscard={() => {
                useTempChangeStore.getState().clearTempChanges()
              }}
              onSave={() => {
                CreateManyStickyNotes(tempStickyNotes)
                handleAddImageNotes(tempImageNotes)
                useTempChangeStore.getState().clearTempChanges()
              }} />}
          <TopRightBar handleChangeRole={handleChangeRole} />
          <LeftToolBar
            onClickStickyNoteButton={onClickCreateStickyNote}
            onClickShape={onClickAddShape}
          />
          <AIChatButton boardId={id.toString()} CreateManyStickyNotes={CreateManyStickyNotes} />
          <ZoomableGrid onSetScale={setScaleHandle} boardId={id.toString()} >
            {Array.from({ length: textItemCount }).map((_, index) => (
              <RNDText key={index} parentScale={scale} />
            ))}
            {stickyNotes.map((stickyNote, index) => (
              <RNDStickyNote key={index} parentScale={scale}
                stickyNote={stickyNote}
                handlemoveStickyNote={handleMoveStickyNote}
                handleReSizeStickyNote={handleReSizeStickyNote}
                handleChangeTextStickyNote={handleChangeTextStickyNote}
                handleLockStickyNote={handleLockStickyNote}
                handleUnLockStickyNote={handleUnLockStickyNote}
                handleDeleteStickyNote={handleDeleteStickyNote}
              />
            ))}
            {tempStickyNotes.map((stickyNote, index) => (
              <RNDStickyNoteTemp key={`temp-${index}`} parentScale={scale} stickyNote={stickyNote} />
            ))}
            {shapeList.map((ShapeComponent, index) => (
              <RNDBase key={index} parentScale={scale}  >
                <ShapeComponent />
              </RNDBase>
            ))}
            {imageNotes.map(note => (
              <RNDImageNote
                key={note.id}
                parentScale={scale}
                imageNote={note}
                onMove={handleMoveImageNote}
                onResize={handleResizeImageNote}
                onDelete={handleDeleteImageNote}
              />
            ))}
            {tempImageNotes.map((imageNote, index) => (
              <RNDImageNoteTemp
                parentScale={scale}
                key={`temp-${index}`}
                imageNote={imageNote}
              />
            ))}
          </ZoomableGrid>
          (</>)}
    </div>
  );
};

export default PlayGroundPage;
