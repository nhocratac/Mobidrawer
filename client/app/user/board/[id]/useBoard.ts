import BoardAPI from "@/api/BoardAPI";
import { useStompStore } from "@/lib/Zustand/socketStore";
import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ShapeComponent = React.FC<React.SVGProps<SVGSVGElement>>;

export function useBoard() {
  const { id } = useParams();
  const { client } = useStompStore();
  const [scale, setScale] = useState(1);
  const [textItemCount, setTextItemCount] = useState(0);
  const [shapeList, setShapeList] = useState<ShapeComponent[]>([]);
  const setBoard = useBoardStoreof((state) => state.setBoard);
  const setStickyNotes = useStickyNoteStore((state) => state.setStickyNotes);

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
    };
  }, []);

  const onClickCreateStickyNote = useCallback(
    (colorName: string) => {
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
    },
    [client, id]
  );

  const handleMoveStickyNote = useCallback(
    (stickyNoteId: string, newPosition: { x: number; y: number }) => {
      client?.publish({
        destination: `/app/board/moveStickyNote/${id}`,
        body: JSON.stringify({ id: stickyNoteId, position: newPosition }),
      });
    },
    [client, id]
  );

  const handleLockStickyNote = useCallback(
    (stickyNoteId: string,) => {
      client?.publish({
        destination: `/app/board/lockStickyNote/${id}`,
        body: JSON.stringify({ id: stickyNoteId}),
      });
    },
    [client, id]
  );

  const handleUnLockStickyNote = useCallback(
    (stickyNoteId: string,) => {
      client?.publish({
        destination: `/app/board/unLockStickyNote/${id}`,
        body: JSON.stringify({ id: stickyNoteId}),
      });
    },
    [client, id]
  );

  const handleReSizeStickyNote = useCallback(
    (
      stickyNoteId: string,
      newSize: { width: number | string; height: number | string }
    ) => {
      // Chuẩn hóa width
      let width =
        typeof newSize.width === "string"
          ? parseInt(newSize.width.replace("px", ""), 10)
          : newSize.width;

      // Chuẩn hóa height
      let height =
        typeof newSize.height === "string"
          ? parseInt(newSize.height.replace("px", ""), 10)
          : newSize.height;

      // Đảm bảo width và height là số hợp lệ
      width = isNaN(width) ? 0 : width; // Nếu parseInt thất bại, mặc định là 0
      height = isNaN(height) ? 0 : height;

      client?.publish({
        destination: `/app/board/reSizeStickyNote/${id}`,
        body: JSON.stringify({
          id: stickyNoteId,
          size: {
            width,
            height,
          },
        }),
      });
    },
    [client, id]
  );

  const handleChangeTextStickyNote = useCallback(
    (stickyNoteId: string, text: string) => {
      if (!client || !client.connected) {
        console.error("STOMP client chưa kết nối!");
        return;
      }
      
      client?.publish({
        destination: `/app/board/ChangeTextStickyNote/${id}`,
        body: JSON.stringify({
          id: stickyNoteId,
          text: text,
        }),
      });
    },
    [client, id]
  );

  const onClickAddShape = useCallback(
    (shape: ShapeComponent) => {
      setShapeList((prevShapes) => [...prevShapes, shape]);
    },
    [setShapeList]
  );

  const setScaleHandle = useCallback(
    (s: number) => {
      setScale(s);
    },
    [setScale]
  );

  return {
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
    handleChangeTextStickyNote,
    handleLockStickyNote,
    handleUnLockStickyNote
  };
}
