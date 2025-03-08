'use client';
import BoardSubscription from '@/app/board/[id]/BoardSubscription';
import { useBoard } from '@/app/board/[id]/useBoard';
import ZoomableGrid from '@/components/BoardGrid/ZoomableGrid';
import RNDBase from "@/components/BoxResizable/RNDBase";
import RNDStickyNote from '@/components/BoxResizable/RNDStickyNote';
import RNDText from '@/components/BoxResizable/RNDText';
import LeftToolBar from '@/components/SideBar/LeftToolBar';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';

const PlayGroundPage = ({ }: {
}) => {

  const { id } = useParams();
  useEffect(() => {
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

  }, []);


  const {
    scale,
    setScaleHandle,
    textItemCount,
    setTextItemCount,
    stickyNoteItemCount,
    stickyNoteColors,
    onClickCreateStickyNote,
    shapeList,
    onClickAddShape,
  } = useBoard();

  return (
    <div className="w-screen h-screen bg-slate-500">
      <BoardSubscription boardId={id.toString()} />
      <LeftToolBar
        onClickTextButton={() => setTextItemCount(textItemCount + 1)}
        onClickStickyNoteButton={onClickCreateStickyNote}
        onClickShape={onClickAddShape}
      />
      <ZoomableGrid onSetScale={setScaleHandle}>
        {Array.from({ length: textItemCount }).map((_, index) => (
          <RNDText key={index} parentScale={scale} />
        ))}

        {Array.from({ length: stickyNoteItemCount }).map((_, index) => (
          <RNDStickyNote key={index} parentScale={scale} colorString={stickyNoteColors[index]} />
        ))}

        {shapeList.map((ShapeComponent, index) => (
          <RNDBase key={index} parentScale={scale}  >
            <ShapeComponent />
          </RNDBase>
        ))}
      </ZoomableGrid>
    </div>
  );
};

export default PlayGroundPage;
