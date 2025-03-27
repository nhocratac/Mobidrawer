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
}

const RNDStickyNote: React.FC<RNDStickyNoteProps> = memo(({ parentScale, stickyNote, handlemoveStickyNote, handleReSizeStickyNote }) => {
  //console.log(`Rendering ${stickyNote.id}`);
  const [text, setText] = useState<string>(stickyNote.text);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const RndRef = useRef<Rnd | null>(null);
  const { moveStickyNote, resizeStickyNote } = useStickyNoteStore()
  const onChangeTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };
  useEffect(() => {
    if (RndRef.current) {
      RndRef.current.updatePosition(stickyNote.position)
    }
  }, [stickyNote.position])
  useEffect(() => {
    RndRef.current?.updateSize(stickyNote.size)
  }, [stickyNote.size])

  const onDrag = (e: DraggableEvent, d: DraggableData) => {
    // useDebouce
    const now = Date.now();
    if (now - lastUpdateRef.current > 1000) { // Chỉ gọi API nếu đã hơn 1000ms
      lastUpdateRef.current = now;
      //updateNotePosition({ x: d.x, y: d.y });
      handlemoveStickyNote(stickyNote.id, { x: d.x, y: d.y });
    }
  }

  const onDragStop = (e: DraggableEvent, d: DraggableData) => {
    if (RndRef.current) {
      RndRef.current.updatePosition({ x: d.x, y: d.y });
    }
    handlemoveStickyNote(stickyNote.id, { x: d.x, y: d.y });
    moveStickyNote(stickyNote.id, { x: d.x, y: d.y }) // Cập nhật vị trí cuối cùng
    onBlurTextArea()
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
    })
    resizeStickyNote(stickyNote.id, {
      width: ref.style.width,
      height: ref.style.height
    })
    RndRef.current?.updateSize({
      width: ref.style.width,
      height: ref.style.height
    })
    RndRef.current?.updatePosition(pos)
    onBlurTextArea()
  };
  const onBlurTextArea = () => {
    textAreaRef.current?.blur();
    setIsTyping(false);
  };

  return (
    <Rnd
      ref={RndRef}
      // position={{
      //   x: stickyNote.position.x,
      //   y: stickyNote.position.y,
      // }}
      // size={{
      //   height: stickyNote.size.height,
      //   width: stickyNote.size.width
      // }}
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
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="w-full h-full relative flex items-center justify-center">
        <textarea
          ref={textAreaRef}
          className={`w-full h-full text-[16px] p-2 ${stickyNote.color}`}
          onChange={onChangeTextArea}
          value={text}
          onBlur={onBlurTextArea}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsTyping(true);
          }}
        />

        {/* Resize handles */}
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
  return (
    prevProps.stickyNote === nextProps.stickyNote &&
    prevProps.parentScale === nextProps.parentScale &&
    prevProps.handlemoveStickyNote === nextProps.handlemoveStickyNote &&
    prevProps.handleReSizeStickyNote === nextProps.handleReSizeStickyNote)
}
);

export default RNDStickyNote;
