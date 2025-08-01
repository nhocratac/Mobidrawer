
import { memo, useEffect, useRef, useState } from "react";
import { DraggableData, Rnd } from "react-rnd";
import Image from "next/image";
import { ImageNote } from "@/lib/Zustand/ImageNoteStore";
import { DraggableEvent } from "react-draggable";
interface RNDImageNoteProps {
    parentScale: number;
    imageNote: ImageNote;
    onMove: (id: string, position: { x: number; y: number }) => void;
    onResize: (id: string, size: { width: string | number; height: string | number }) => void;
    onDelete: (id: string) => void;
}

const RNDImageNote: React.FC<RNDImageNoteProps> = memo(
    ({ parentScale, imageNote, onMove, onResize, onDelete }) => {
        const RndRef = useRef<Rnd | null>(null);
        const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
        const lastTime = useRef<number>(new Date().getTime());

        useEffect(() => {
            RndRef.current?.updatePosition(imageNote.position);
        }, [imageNote.position]);

        useEffect(() => {
            RndRef.current?.updateSize(imageNote.size);
        }, [imageNote.size]);

        useEffect(() => {
            const handleClickOutside = () => setContextMenu(null);
            window.addEventListener("click", handleClickOutside);
            return () => window.removeEventListener("click", handleClickOutside);
        }, []);

        useEffect(() => {
            RndRef.current?.updatePosition({
                x: imageNote.position.x,
                y: imageNote.position.y,
            });
        }, [imageNote.position.x, imageNote.position.y]);

        const onDrag = (e:DraggableEvent, d:DraggableData) => {
            const currentTime = new Date().getTime();
            if (currentTime - lastTime.current > 1000) {
                lastTime.current = currentTime;
                e.stopPropagation();
                onMove(imageNote.id, { x: d.x, y: d.y });
                return;
            }
        }

        if (!imageNote.url) {
            return <div className="text-red-500">Image URL is missing</div>;
        }

        return (
            <Rnd
                ref={RndRef}
                default={{
                    x: imageNote.position.x,
                    y: imageNote.position.y,
                    width: imageNote.size.width,
                    height: imageNote.size.height,
                }}
                bounds="window"
                className="relative border border-gray-400 shadow-lg"
                scale={parentScale}
                minWidth={100}
                minHeight={100}
                onDrag={onDrag}
                onDragStop={(_, d) => {
                    onMove(imageNote.id, { x: d.x, y: d.y });
                }}
                onResizeStop={(e, dir, ref, delta, pos) => {
                    console.log("Resize stopped", e, dir, ref, delta, pos);
                    const newSize = { width: ref.style.width, height: ref.style.height };
                    onResize(imageNote.id, newSize);
                }}
                onMouseDown={(e) => {
                    e.stopPropagation()
                }}
            // onContextMenu={(e) => {
            //     e.preventDefault();
            //     e.stopPropagation();
            //     const rect = e.currentTarget.getBoundingClientRect();
            //     setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            // }}
            >
                <div className="w-full h-full relative"
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}>
                    <Image
                        src={imageNote.url}
                        alt="note"
                        fill
                        className="object-contain rounded"
                        sizes="(max-width: 768px) 100vw, 300px"
                    />

                    {contextMenu && (
                        <div
                            className="absolute z-50 bg-white border rounded-md p-2 shadow-md text-sm"
                            style={{ top: contextMenu.y, left: contextMenu.x }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="font-bold mb-1">Image Note</div>
                            <button
                                className="w-full text-left px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                                onClick={() => {
                                    setContextMenu(null);
                                    onDelete(imageNote.id);
                                }}
                            >
                                🗑 Delete Image
                            </button>
                        </div>
                    )}
                </div>
            </Rnd>
        );
    }
);

RNDImageNote.displayName = "RNDImageNote";
export default RNDImageNote;
