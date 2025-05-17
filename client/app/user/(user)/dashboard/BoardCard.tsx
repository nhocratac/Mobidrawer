// components/BoardCard.tsx
import Link from "next/link";
import Image from "next/image";
import { ContextMenuWrapper } from "@/app/user/(user)/dashboard/ContextMenuWrapper";

interface BoardCardProps {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
}

export default function BoardCard({
    id,
    name,
    description,
    thumbnail,
}: BoardCardProps) {
    const onClickChangeImage = () => {
    }
    return (
        <ContextMenuWrapper onClickChangeImage={onClickChangeImage}>
            <Link href={`/user/board/${id}`}>
                <div className="p-3 sm:p-6 md:p-10 hover:cursor-pointer hover:bg-slate-100 hover:scale-105 hover:-rotate-1 h-auto flex flex-col">
                    <Image
                        src={thumbnail}
                        alt="thumbnail"
                        width={80}
                        height={80}
                        className="w-full aspect-square object-cover flex-1 rounded-sm"
                    />
                    <div className="mt-2">
                        <p className="text-base sm:text-xl md:text-2xl font-bold truncate">{name}</p>
                        <p className="text-xs sm:text-sm md:text-lg font-light truncate">{description}</p>
                    </div>
                </div>
            </Link>
        </ContextMenuWrapper>
    );
}
