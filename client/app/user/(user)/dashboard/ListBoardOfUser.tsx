import BoardAPI from "@/api/BoardAPI";
import BoardCard from "@/app/user/(user)/dashboard/BoardCard";
import BoardRow from "@/app/user/(user)/dashboard/BoardRow";
import useDashBoard, { ListBoardOfUserProps } from "@/app/user/(user)/dashboard/useDashBoard";
import { Skeleton } from "@/components/ui/skeleton";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { useCallback, useEffect, useRef, useState } from "react";

function ListBoardOfUser({ modeView, ...props }: ListBoardOfUserProps) {
    const { boards } = useDashBoard();
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const { user } = useTokenStore();
    const inputRef = useRef<HTMLInputElement>(null);

    const acceptUploadImage = useCallback(async (localPreviewUrl: string) => {
        if (!selectedBoardId || !inputRef.current?.files?.length) return;

        console.log("Uploading image...", localPreviewUrl);
        const file = inputRef.current.files[0];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", user?.id || "");

        try {
            const res = await fetch("/api/upload-board-thumbnail", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.url) {
                await BoardAPI.changeThumbnail(selectedBoardId, data.url);
                console.log("Thumbnail updated:", data.url);
            }
        } catch (error) {
            console.error("Upload failed", error);
            // reset lại preview nếu lỗi
            setPreviewUrl(null);
        }
    }, [selectedBoardId, user]);

    const onChangeImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url); // gán URL để preview
            acceptUploadImage(url); // upload ngay sau khi chọn
        }
    }, [acceptUploadImage]);

    const onClickChangeImage = useCallback((boardId: string) => {
        setSelectedBoardId(boardId);
        inputRef.current?.click();
    }, []);

    useEffect(() => {
        return () => {
            // cleanup object URL tránh leak bộ nhớ
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    if (!boards) {
        return (
            <div className="w-full flex-1 p-4 md:p-8 flex flex-col gap-4">
                <Skeleton className="w-full h-8 rounded-md" />
                <Skeleton className="w-full h-28 rounded-md" />
                <Skeleton className="w-full h-28 rounded-md" />
                <Skeleton className="w-full h-28 rounded-md" />
            </div>
        );
    }

    if (modeView === 'List') {
        return (
            <div className={`px-2 sm:px-4 md:px-12 w-full flex-1 overflow-auto ${props}`}>
                <div className="min-w-full overflow-x-auto pb-4">
                    <input
                        type="file"
                        ref={inputRef}
                        className="hidden"
                        onChange={onChangeImage}
                        accept="image/png, image/jpeg" />
                    <table className="w-full min-w-[640px]">
                        <thead>
                            <tr className="font-light text-base sm:text-lg md:text-2xl text-left">
                                <th className="w-2/5 p-2">Tên</th>
                                <th className="w-[15%] p-2">Thành viên</th>
                                <th className="w-[15%] p-2">Lần cuối mở</th>
                                <th className="w-[15%] p-2">Chủ sở hữu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                boards.map((data, index) => (
                                    <BoardRow
                                        key={index}
                                        id={data.id}
                                        name={data.name}
                                        description={data.description}
                                        type={data.type}
                                        updateAt={data.updateAt}
                                        owner={data.owner}
                                        // nếu là board đang chọn và có preview thì show preview
                                        thumbnail={(data.id === selectedBoardId && previewUrl) ? previewUrl : data.thumbnail}
                                        onClickChangeImage={() => onClickChangeImage(data.id)}
                                    />
                                ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (modeView === 'Grid') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-4 md:px-12 flex-1 overflow-y-auto pb-4">
                {
                    boards.map((data, index) => (
                        <BoardCard
                            key={index}
                            id={data.id}
                            name={data.name}
                            description={data.description}
                            thumbnail={data.thumbnail}
                        />
                    ))
                }
            </div>
        );
    }

    return <div />;
}

export default ListBoardOfUser;
