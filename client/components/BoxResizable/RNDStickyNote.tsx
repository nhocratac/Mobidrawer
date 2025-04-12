import useDebounce from "@/hooks/useDebounce";
import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { StickyNote } from "@/lib/Zustand/type.type";
import React, { memo, useEffect, useRef, useState } from "react";
import { DraggableData, DraggableEvent } from "react-draggable";
import { Rnd } from "react-rnd";

interface RNDStickyNoteProps {
  parentScale: number;
  stickyNote: StickyNote;
  handlemoveStickyNote: (id: string, position: { x: number; y: number }) => void;
  handleReSizeStickyNote: (id: string, size: { width: number | string, height: number | string }) => void;
  handleChangeTextStickyNote: (stickyNoteId: string, text: string) => void;
  handleLockStickyNote: (stickyNoteId: string) => void;
  handleUnLockStickyNote: (stickyNoteId: string) => void;
}

const RNDStickyNote: React.FC<RNDStickyNoteProps> = memo(({
  parentScale,
  stickyNote,
  handlemoveStickyNote,
  handleReSizeStickyNote,
  handleChangeTextStickyNote,
  handleLockStickyNote,
  handleUnLockStickyNote
}) => {
  const [text, setText] = useState<string>(stickyNote.text);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const RndRef = useRef<Rnd | null>(null);
  const { user } = useTokenStore();
  const { moveStickyNote, resizeStickyNote } = useStickyNoteStore();
  const debouncedText = useDebounce(text, 1000);

  useEffect(() => {
    handleChangeTextStickyNote(stickyNote.id, debouncedText);
  }, [debouncedText]);

  useEffect(() => {
    const blockEvents = (e: Event) => e.stopPropagation();
    const handleFocus = () => {
      handleLockStickyNote(stickyNote.id);
      document.addEventListener("keydown", blockEvents, true);
      document.addEventListener("mousedown", blockEvents, true);
    };
    const handleBlur = () => {
      handleUnLockStickyNote(stickyNote.id);
      document.removeEventListener("keydown", blockEvents, true);
      document.removeEventListener("mousedown", blockEvents, true);
    };
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.addEventListener("focus", handleFocus);
      textarea.addEventListener("blur", handleBlur);
    }
    return () => {
      if (textarea) {
        textarea.removeEventListener("focus", handleFocus);
        textarea.removeEventListener("blur", handleBlur);
      }
      document.removeEventListener("keydown", blockEvents, true);
      document.removeEventListener("mousedown", blockEvents, true);
    };
  }, []);

  useEffect(() => {
    if (!isTyping && text !== stickyNote.text) {
      setText(stickyNote.text);
    }
  }, [stickyNote.text, isTyping]);

  useEffect(() => {
    RndRef.current?.updatePosition(stickyNote.position);
  }, [stickyNote.position]);

  useEffect(() => {
    RndRef.current?.updateSize(stickyNote.size);
  }, [stickyNote.size]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const onChangeTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const onDrag = (e: DraggableEvent, d: DraggableData) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 1000) {
      lastUpdateRef.current = now;
      handlemoveStickyNote(stickyNote.id, { x: d.x, y: d.y });
    }
  };

  const onDragStop = (e: DraggableEvent, d: DraggableData) => {
    RndRef.current?.updatePosition({ x: d.x, y: d.y });
    handlemoveStickyNote(stickyNote.id, { x: d.x, y: d.y });
    moveStickyNote(stickyNote.id, { x: d.x, y: d.y });
    if (!isTyping) onBlurTextArea();
  };

  const handleResizeStop = (
    e: MouseEvent | TouchEvent,
    direction: string,
    ref: HTMLElement,
    delta: { width: number; height: number },
    pos: { x: number; y: number }
  ) => {
    handleReSizeStickyNote(stickyNote.id, {
      width: ref.style.width,
      height: ref.style.height
    });
    resizeStickyNote(stickyNote.id, {
      width: ref.style.width,
      height: ref.style.height
    });
    RndRef.current?.updateSize({
      width: ref.style.width,
      height: ref.style.height
    });
    RndRef.current?.updatePosition(pos);
    if (!isTyping) onBlurTextArea();
  };

  const onBlurTextArea = () => {
    if (textAreaRef.current && textAreaRef.current === document.activeElement) {
      textAreaRef.current.blur();
    }
    setIsTyping(false);
  };

  return (
    <Rnd
      ref={RndRef}
      default={{
        x: stickyNote.position.x,
        y: stickyNote.position.y,
        height: stickyNote.size.height,
        width: stickyNote.size.width,
      }}
      bounds="window"
      resizeHandleComponent={{
        bottomLeft: <div className="absolute bottom-left-handle bg-white h-4 w-4 cursor-sw-resize rounded-full bottom-[5px] left-[5px]" />,
        bottomRight: <div className="absolute bottom-right-handle bg-white h-4 w-4 cursor-se-resize rounded-full bottom-[5px] right-[5px]" />,
        topRight: <div className="absolute top-right-handle bg-white h-4 w-4 cursor-ne-resize rounded-full top-[5px] right-[5px]" />,
        topLeft: <div className="absolute top-left-handle bg-white h-4 w-4 cursor-nw-resize rounded-full top-[5px] left-[5px]" />,
        top: <div className="top-handle" />,
        right: <div className="right-handle" />,
        bottom: <div className="bottom-handle" />,
        left: <div className="left-handle" />,
      }}
      minWidth={200}
      minHeight={200}
      className="border-2 border-black relative z-10"
      scale={parentScale}
      enableResizing={(user?.id === stickyNote.isSelected)}
      disableDragging={isTyping && !(user?.id === stickyNote.isSelected)}
      onDrag={onDrag}
      onDragStop={onDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!isTyping) onBlurTextArea();
      }}
    >
      <div className="w-full h-full relative flex items-center justify-center"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <textarea
          ref={textAreaRef}
          className={`w-full h-full text-[16px] p-2 ${stickyNote.color}`}
          onChange={onChangeTextArea}
          value={text}
          onBlur={onBlurTextArea}
          onFocus={() => setIsTyping(true)}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsTyping(true);
            setTimeout(() => textAreaRef.current?.focus(), 50);
          }}
        />
        <div className="absolute top-0 right-0 p-1 max-w-[80px] whitespace-nowrap overflow-hidden text-ellipsis bg-lime-700 text-white rounded-bl-xl">
          {!!stickyNote.isSelected ? "Peter" : "Free"}
        </div>

        {contextMenu && (
          <div
            className="absolute bg-white shadow-md border rounded-md p-2 text-sm lg:text-base z-50 w-[200px]"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="font-bold mb-2">Sticky Note</div>

            <div className="mb-1 text-gray-600">
              <div>👤 Owner: {stickyNote.owner || "Unknown"}</div>
              <div>🕒 Updated: {stickyNote.updateAt ? new Date(stickyNote.updateAt).toLocaleString() : "N/A"}</div>
            </div>

            <hr className="my-2" />

            {!!stickyNote.isSelected ? (
              <button
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                onClick={() => {
                  setContextMenu(null);
                  handleUnLockStickyNote(stickyNote.id);
                }}
              >
                🔓 Unlock
              </button>
            ) : (
              <button
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                onClick={() => {
                  setContextMenu(null);
                  handleLockStickyNote(stickyNote.id);
                }}
              >
                🔒 Lock
              </button>
            )}

            <button
              className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              onClick={() => {
                setContextMenu(null);
                textAreaRef.current?.focus();
              }}
            >
              ✏️ Edit Note
            </button>

            <button
              className="w-full text-left px-2 py-1 text-red-600 hover:bg-red-100 rounded"
              onClick={() => {
                setContextMenu(null);
                // TODO: deleteStickyNote(stickyNote.id)
              }}
            >
              🗑 Delete Note
            </button>
          </div>
        )}
      </div>
    </Rnd>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.stickyNote === nextProps.stickyNote &&
    prevProps.parentScale === nextProps.parentScale &&
    prevProps.handlemoveStickyNote === nextProps.handlemoveStickyNote &&
    prevProps.handleReSizeStickyNote === nextProps.handleReSizeStickyNote &&
    prevProps.handleChangeTextStickyNote === nextProps.handleChangeTextStickyNote
  );
});

RNDStickyNote.displayName = "RNDStickyNote";

export default RNDStickyNote;
