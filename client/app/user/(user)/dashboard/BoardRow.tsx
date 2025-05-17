// components/BoardRow.tsx
import { ContextMenuWrapper } from "@/app/user/(user)/dashboard/ContextMenuWrapper";
import Image from "next/image";
import Link from "next/link";



interface BoardRowProps {
    id: string;
    name: string;
    description: string;
    type: string;
    updateAt: string;
    owner: string;
    thumbnail: string;
    onClickChangeImage: () => void;
    // acceptUploadImage : () => void;
}

export default function BoardRow({
    id,
    name,
    description,
    type,
    updateAt,
    owner,
    thumbnail,
    onClickChangeImage,
    // acceptUploadImage
}: BoardRowProps) {
    return (
        <tr className="p-2 hover:cursor-pointer hover:bg-slate-100">
            <td className="flex">
                <ContextMenuWrapper onClickChangeImage={onClickChangeImage}>
                    <div className="flex p-1 sm:p-2">
                        <Link href={`/user/board/${id}`} className="flex">
                            <Image
                                src={thumbnail}
                                alt="thumbnail"
                                width={40}
                                height={40}
                                className="w-[40px] h-[40px] sm:w-[56px] sm:h-[56px] object-cover"
                            />
                            {/* {previewUrl && (
                                <button
                                    onClick={acceptUploadImage}
                                    className="absolute -bottom-5 left-0 text-xs text-blue-500 hover:underline"
                                >
                                    Xác nhận ảnh
                                </button>
                            )} */}
                            <div className="h-[40px] sm:h-[56px] ml-2">
                                <p className="text-base sm:text-xl md:text-2xl font-bold truncate max-w-[200px] sm:max-w-none">{name}</p>
                                <p className="text-xs sm:text-sm md:text-lg font-light truncate max-w-[200px] sm:max-w-none">{description}</p>
                            </div>
                        </Link>
                    </div>
                </ContextMenuWrapper>
            </td>
            <td className="p-2">
                <Link href={`/user/board/${id}`} className="text-sm sm:text-lg md:text-2xl">{type}</Link>
            </td>
            <td className="p-2">
                <Link href={`/user/board/${id}`} className="text-sm sm:text-lg md:text-2xl">{updateAt}</Link>
            </td>
            <td className="p-2">
                <Link href={`/user/board/${id}`} className="text-sm sm:text-lg md:text-2xl">{owner}</Link>
            </td>
        </tr>
    );
}
