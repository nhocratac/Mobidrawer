import BoardAPI from "@/api/BoardAPI";
import { useStompStore } from "@/lib/Zustand/socketStore";
import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ShapeComponent = React.FC<React.SVGProps<SVGSVGElement>>;

export function useBoard() {
  const { id } = useParams();
  const { client } = useStompStore();
  const [scale, setScale] = useState(1);
  const [textItemCount, setTextItemCount] = useState(0);
  const [shapeList, setShapeList] = useState<ShapeComponent[]>([]);
  const {  setBoard } = useBoardStoreof();
  const { setStickyNotes  } = useStickyNoteStore();

  useEffect(() => {
    if (!id) return;
    BoardAPI.getBoardById(id.toString())
      .then((res) => {
        setBoard(res);
        setStickyNotes(res.stickyNotes ? res.stickyNotes : []);
      })
      .catch(() => {
        console.log("get board by id error:");
      });
  }, [id]);

  // xóa shape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        setShapeList([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    }
  })

  const onClickCreateStickyNote = (colorName: string) => {
    const newStickyNote = {
      color: colorName,
      position: { x: 100, y: 100 },
      size: { width: 200, height: 200 },
      text: "Type here...",
    };
    client?.publish({
      destination: `/app/board/addStickyNote/${id}`,
      body: JSON.stringify(newStickyNote),
    });
  };

  const handleMoveStickyNote = (stickyNoteId: string, newPosition: { x: number; y: number }) => {
    client?.publish({
      destination: `/app/board/moveStickyNote/${id}`,
      body: JSON.stringify({ id : stickyNoteId, position: newPosition }),
    }); 
    
  }

  const onClickAddShape = (shape: ShapeComponent) => {
    setShapeList((prevShapes) => [...prevShapes, shape]);
  };

  const setScaleHandle = (s: number) => {
    setScale(s);
  };

  return {
    id,
    scale,
    setScaleHandle,
    textItemCount,
    setTextItemCount,
    onClickCreateStickyNote,
    shapeList,
    onClickAddShape,
    handleMoveStickyNote
  };
}
