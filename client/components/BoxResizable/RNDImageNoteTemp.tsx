import { CreateImageNoteDto } from "@/lib/Zustand/ImageNoteStore";
import Image from "next/image";
import { memo } from "react";

interface RNDImageNoteTempProps {
    parentScale: number;
    imageNote: CreateImageNoteDto;
}

const RNDImageNoteTemp: React.FC<RNDImageNoteTempProps> = memo(({ parentScale, imageNote }) => {
    if (!imageNote.url) {
        return <div className="text-red-500">Image URL is missing</div>;
    }

    return (
        <div
            style={{
                transform: `scale(${parentScale})`,
                transformOrigin: "top left",
                position: "absolute",
                left: imageNote.position.x,
                top: imageNote.position.y,
                width: imageNote.size.width,
                height: imageNote.size.height,
                pointerEvents: "none", // không cho tương tác
                zIndex: 5,
            }}
            className="rounded border border-dashed border-red-500"
        >
            <Image
                src={imageNote.url}
                alt="Temp Image"
                fill
                className="object-contain rounded opacity-60"
                sizes="(max-width: 768px) 100vw, 300px"
            />
        </div>
    );
});

RNDImageNoteTemp.displayName = "RNDImageNoteTemp";
export default RNDImageNoteTemp;
