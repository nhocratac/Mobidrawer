import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";
import { StickyNote } from "@/lib/Zustand/type.type";
import React, { useRef, useState } from "react";
import { DraggableData, DraggableEvent } from "react-draggable";
import { Rnd } from "react-rnd";

interface RNDStickyNoteProps {
  parentScale: number;
  stickyNote: StickyNote;
  handlemoveStickyNote: (id: string, position: { x: number; y: number }) => void;
}

const RNDStickyNote: React.FC<RNDStickyNoteProps> = ({ parentScale, stickyNote, handlemoveStickyNote }) => {
  const [text, setText] = useState<string>(stickyNote.text);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const RndRef = useRef<Rnd | null>(null);
  const {  moveStickyNote } = useStickyNoteStore()
  const onChangeTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

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
    if(RndRef.current){
      console.log('updatePosition', { x: d.x, y: d.y });
      RndRef.current.updatePosition({ x: d.x, y: d.y });
      //stickyNote.position = { x: d.x, y: d.y };
      moveStickyNote(stickyNote.id, { x: d.x, y: d.y });
    }
    handlemoveStickyNote(stickyNote.id, { x: d.x, y: d.y }); // Cập nhật vị trí cuối cùng
  };

  const handleResizeStop = (
    e: MouseEvent | TouchEvent,
    direction: string,
    ref: HTMLElement,
    delta: { width: number; height: number },
    pos: { x: number; y: number }
  ) => {
  };
  const onBlurTextArea = () => {
    textAreaRef.current?.blur();
    setIsTyping(false);
  };

  return (
    <Rnd
      ref={RndRef}
      position={{
        x: stickyNote.position.x,
        y: stickyNote.position.y,
      }}
      size={{
        height: stickyNote.size.height,
        width: stickyNote.size.width
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
};

export default RNDStickyNote;
