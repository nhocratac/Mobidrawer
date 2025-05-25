import BoardAPI from "@/api/BoardAPI";
import boardTemplateConfig from "@/config/boardTemplates";
import { useStompStore } from "@/lib/Zustand/socketStore";
import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import { CreateStickNoteDto } from "@/lib/Zustand/type.type";
import useUserInBoardStore from "@/lib/Zustand/userInBoardStore";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ShapeComponent = React.FC<React.SVGProps<SVGSVGElement>>;

type Status = 401 | 404 | 200

export function useBoard() {
  const { id } = useParams();
  const { client } = useStompStore();
  const [scale, setScale] = useState(1);
  const [textItemCount, setTextItemCount] = useState(0);
  const [shapeList, setShapeList] = useState<ShapeComponent[]>([]);
  const [status, setStatus] = useState<Status>(200);
  const setBoard = useBoardStoreof((state) => state.setBoard);
  const setStickyNotes = useStickyNoteStore((state) => state.setStickyNotes);
  const { setUsers } = useUserInBoardStore();

  useEffect(() => {
    if (!id) return;
    BoardAPI.getBoardById(id.toString())
      .then((res) => {
        setBoard(res);
        setStickyNotes(res.stickyNotes ? res.stickyNotes : []);

        // Check if this is a newly created board with a template index
        const templateIndex = localStorage.getItem("boardTemplateIndex");
        if (templateIndex !== null) {
          // Create sticky notes based on the template index
          const index = parseInt(templateIndex, 10);
          if (index >= 0 && index < boardTemplateConfig.length) {
            createTemplateNotes(index);
          }
          // Clear the template index from local storage after use
          localStorage.removeItem("boardTemplateIndex");
        }

        BoardAPI.getDetailMemberInBoard(id.toString())
          .then((res) => {
            setUsers(res);
            console.log("users in board", res);
          })
          .catch(() => {
            console.log("get board by id error:");
          });
      })
      .catch((e) => {
        if (
          e.response.data.message == "You are not allowed to access this board"
        ) {
          console.error("You are not allowed to access this board");
          setStatus(401);
        } else if (e.status == 404) {
          console.log("notfound")
          setStatus(404)
        } else console.log("get board by id error: ", e);
      });
  }, []);

  // Function to create template-specific sticky notes
  const createTemplateNotes = useCallback(
    (templateIndex: number) => {
      if (!client || !id) return;

      // Get the template notes configuration for this index
      const templateNotes = boardTemplateConfig[templateIndex];

      // Create each template note
      templateNotes.forEach((templateNote) => {
        client.publish({
          destination: `/app/board/addStickyNote/${id}`,
          body: JSON.stringify(templateNote),
        });
      });
    },
    [client, id]
  );

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

  const CreateManyStickyNotes = useCallback(
    (stickyNotes : CreateStickNoteDto[]) => {
      client?.publish({
        destination: `/app/board/addStickyNotes/${id}`,
        body: JSON.stringify(stickyNotes),
      });
    }, [client]
  )

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
    (stickyNoteId: string) => {
      client?.publish({
        destination: `/app/board/lockStickyNote/${id}`,
        body: JSON.stringify({ id: stickyNoteId }),
      });
    },
    [client, id]
  );

  const handleUnLockStickyNote = useCallback(
    (stickyNoteId: string) => {
      client?.publish({
        destination: `/app/board/unLockStickyNote/${id}`,
        body: JSON.stringify({ id: stickyNoteId }),
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

  const handleDeleteStickyNote = useCallback(
    (stickyNoteId: string) => {
      if (!client || !client.connected) {
        console.error("STOMP client chưa kết nối!");
        return;
      }
      console.log(stickyNoteId);
      client.publish({
        destination: `/app/board/deleteStickyNote/${id}`,
        body: JSON.stringify({
          id: stickyNoteId,
        }),
      });
    },
    [id]
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

  const handleChangeRole = useCallback(
    async (memberId: string, role: "EDITOR" | "VIEWER") => {
      try {
        const res = await BoardAPI.changeRoleMember(
          id.toString(),
          memberId,
          role
        );
        setBoard(res);
      } catch (error) {
        console.log(error);
      }
    },
    [id]
  );

  return {
    id,
    status,
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
    handleUnLockStickyNote,
    handleChangeRole,
    handleDeleteStickyNote,
    CreateManyStickyNotes
  };
}
