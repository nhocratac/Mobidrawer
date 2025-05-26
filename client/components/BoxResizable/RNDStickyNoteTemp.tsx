import { CreateStickNoteDto } from "@/lib/Zustand/type.type";
import { memo, useEffect, useRef, useState } from "react";
import { DraggableData, DraggableEvent } from "react-draggable";
import { Rnd } from "react-rnd";


interface RNDStickyNoteTempProps {
    parentScale: number;
    stickyNote: CreateStickNoteDto;
}

const RNDStickyNoteTemp: React.FC<RNDStickyNoteTempProps> = memo(({ parentScale, stickyNote }) => {
    const [text, setText] = useState<string>(stickyNote.text);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const RndRef = useRef<Rnd | null>(null);

    useEffect(() => {
        setText(stickyNote.text);
    }, [stickyNote.text]);

    useEffect(() => {
        RndRef.current?.updatePosition(stickyNote.position);
    }, [stickyNote.position]);

    useEffect(() => {
        RndRef.current?.updateSize(stickyNote.size);
    }, [stickyNote.size]);

    const onChangeTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        // Đây là temp nên chưa gọi store update, có thể bổ sung nếu cần
    };

    const onBlurTextArea = () => {
        if (textAreaRef.current && textAreaRef.current === document.activeElement) {
            textAreaRef.current.blur();
        }
        setIsTyping(false);
    };

    // Chỉ drag, resize local không gọi api hay store
    const onDragStop = (e: DraggableEvent, d: DraggableData) => {
        RndRef.current?.updatePosition({ x: d.x, y: d.y });
    };

    const handleResizeStop = (
        e: MouseEvent | TouchEvent,
        direction: string,
        ref: HTMLElement,
        delta: { width: number; height: number },
        pos: { x: number; y: number }
    ) => {
        RndRef.current?.updateSize({
            width: ref.style.width,
            height: ref.style.height,
        });
        RndRef.current?.updatePosition(pos);
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
            className="border-2 border-red-600 border-dashed relative z-10"
            scale={parentScale}
            onDragStop={onDragStop}
            onResizeStop={handleResizeStop}
            disableDragging={isTyping}
            enableResizing={!isTyping}
            onMouseDown={(e) => {
                e.stopPropagation();
                if (!isTyping) onBlurTextArea();
            }}
        >
            <div className="w-full h-full relative flex items-center justify-center">
                <textarea
                    ref={textAreaRef}
                    className={`w-full h-full text-[16px] p-2 ${stickyNote.color} opacity-50`}
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
            </div>
        </Rnd>
    );
}, (prevProps, nextProps) => prevProps.stickyNote === nextProps.stickyNote && prevProps.parentScale === nextProps.parentScale);

RNDStickyNoteTemp.displayName = "RNDStickyNoteTemp";

export default RNDStickyNoteTemp;
