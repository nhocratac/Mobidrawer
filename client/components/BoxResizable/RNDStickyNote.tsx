import useDebounce from "@/hooks/useDebounce";
import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";
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
}

const RNDStickyNote: React.FC<RNDStickyNoteProps> = memo(({
  parentScale,
  stickyNote,
  handlemoveStickyNote,
  handleReSizeStickyNote,
  handleChangeTextStickyNote,
}) => {
  const [text, setText] = useState<string>(stickyNote.text);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const RndRef = useRef<Rnd | null>(null);
  const { moveStickyNote, resizeStickyNote, changTextStickNote } = useStickyNoteStore();
  const debouncedText = useDebounce(text, 1000);

  useEffect(() => {
    handleChangeTextStickyNote(stickyNote.id, debouncedText);
  }, [debouncedText]);

  useEffect(() => {
    const blockEvents = (e: Event) => {
       e.stopPropagation();
      // e.preventDefault();
    };
    const handleFocus = () => {
      document.addEventListener("keydown", blockEvents, true);
      document.addEventListener("mousedown", blockEvents, true);
    };
    const handleBlur = () => {
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

  const onChangeTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);
   // handleChangeTextStickyNote(stickyNote.id, newValue);
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
    // Nếu người dùng không đang nhập, mới blur
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
    // Kiểm tra xem textarea có đang focus không
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
      minWidth={200}
      minHeight={200}
      className="border-2 border-black relative"
      scale={parentScale}
      enableResizing={true}
      disableDragging={isTyping}
      onDrag={onDrag}
      onDragStop={onDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={(e) => {
        // Nếu click ra ngoài, blur textarea (nếu cần)
        e.stopPropagation();
        if (!isTyping) onBlurTextArea();
      }}
    >
      <div className="w-full h-full relative flex items-center justify-center">
        <textarea
          ref={textAreaRef}
          className={`w-full h-full text-[16px] p-2 ${stickyNote.color}`}
          onChange={onChangeTextArea}
          value={text}
          onBlur={onBlurTextArea}
          onFocus={() => setIsTyping(true)}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsTyping(true);
            setTimeout(() => textAreaRef.current?.focus(), 50);
          }}
        />
        {/* Các resize handles */}
        {[
          { top: "-5px", left: "-5px", cursor: "nw-resize" },
          { top: "-5px", right: "-5px", cursor: "ne-resize" },
          { bottom: "-5px", left: "-5px", cursor: "sw-resize" },
          { bottom: "-5px", right: "-5px", cursor: "se-resize" },
        ].map((style, index) => (
          <div
            key={index}
            className="absolute bg-white border-2 border-black rounded-full"
            style={{ width: "10px", height: "10px", ...style }}
          />
        ))}
      </div>
    </Rnd>
  );
}, (prevProps, nextProps) => {
  // Kiểm tra các props cơ bản để tránh render lại không cần thiết
  return (
    prevProps.stickyNote === nextProps.stickyNote &&
    prevProps.parentScale === nextProps.parentScale &&
    prevProps.handlemoveStickyNote === nextProps.handlemoveStickyNote &&
    prevProps.handleReSizeStickyNote === nextProps.handleReSizeStickyNote &&
    prevProps.handleChangeTextStickyNote === nextProps.handleChangeTextStickyNote
  );
});

export default RNDStickyNote;
