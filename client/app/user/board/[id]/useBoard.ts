import BoardAPI from "@/api/BoardAPI";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ShapeComponent = React.FC<React.SVGProps<SVGSVGElement>>;

export function useBoard() {
  const { id } = useParams();
  const { client } = useStompStore();
  const [scale, setScale] = useState(1);
  const [textItemCount, setTextItemCount] = useState(0);
  const [stickyNoteItemCount, setStickyNoteItemCount] = useState(0);
  const [shapeList, setShapeList] = useState<ShapeComponent[]>([]);
  const [stickyNoteColors, setStickyNoteColors] = useState<string[]>([]);
  const {setBoard} = useBoardStoreof()

  useEffect(() => {
    if (!id) return;
    BoardAPI.getBoardById(id.toString())
      .then((res) => {
        setBoard(res);
      })
      .catch((err) => {
        console.log("get board by id error:");
        console.log(err);
      });
  }, [id]);

  const onClickCreateStickyNote = (colorName: string) => {
    setStickyNoteItemCount((prev) => prev + 1);
    setStickyNoteColors((prevColors) => [...prevColors, colorName]);
  };

  const onClickAddShape = (shape: ShapeComponent) => {
    setShapeList((prevShapes) => [...prevShapes, shape]);
  };

  const setScaleHandle = (s: number) => {
    setScale(s);
  };

  const sendMessage = () => {
    client?.publish({
      destination: "/app/board/join/" + id,
      body: JSON.stringify({
        userId: "thang12121",
      }),
    });
  };

  return {
    id,
    scale,
    setScaleHandle,
    textItemCount,
    setTextItemCount,
    stickyNoteItemCount,
    setStickyNoteItemCount,
    stickyNoteColors,
    onClickCreateStickyNote,
    shapeList,
    onClickAddShape,
    sendMessage,
  };
}
