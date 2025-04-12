import useDashBoard, { ListBoardOfUserProps } from "@/app/user/(user)/dashboard/useDashBoard";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

function ContextMenuWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="w-full">{children}</ContextMenuTrigger>
            <ContextMenuContent className="z-50">
                <ContextMenuItem>Hồ sơ</ContextMenuItem>
                <ContextMenuItem>Thanh toán</ContextMenuItem>
                <ContextMenuItem>Nhóm</ContextMenuItem>
                <ContextMenuItem>Đăng kí</ContextMenuItem>
                <ContextMenuItem>Đổi tên</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

function ListBoardOfUser({ modeView, ...props }: ListBoardOfUserProps) {
    const { boards } = useDashBoard();
    
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
                    <table className="w-full min-w-[640px]">
                        <thead>
                            <tr className="font-light text-base sm:text-lg md:text-2xl text-left">
                                <th className="w-2/5 p-2">Tên</th>
                                <th className="w-[15%] p-2">Hoạt động</th>
                                <th className="w-[15%] p-2">Khoảng Trống</th>
                                <th className="w-[15%] p-2">Lần cuối mở</th>
                                <th className="w-[15%] p-2">Chủ sở hữu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                boards.map((data, index) => (
                                    <tr className="p-2 hover:cursor-pointer hover:bg-slate-100" key={index}>
                                        <td className="flex">
                                            <ContextMenuWrapper>
                                                <div className="flex p-1 sm:p-2">
                                                    <Link href={`/user/board/${data.id}`} className="flex">
                                                        <img src={data.thumbnail} alt="thumbnail" className="w-[40px] h-[40px] sm:w-[56px] sm:h-[56px] object-cover" />
                                                        <div className="h-[40px] sm:h-[56px] ml-2"> 
                                                            <p className="text-base sm:text-xl md:text-2xl font-bold truncate max-w-[200px] sm:max-w-none">{data.name}</p>
                                                            <p className="text-xs sm:text-sm md:text-lg font-light truncate max-w-[200px] sm:max-w-none">{data.description}</p>
                                                        </div>
                                                    </Link>
                                                </div>
                                            </ContextMenuWrapper>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/user/board/${data.id}`} className="text-sm sm:text-lg md:text-2xl">0</Link>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/user/board/${data.id}`} className="text-sm sm:text-lg md:text-2xl">0</Link>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/user/board/${data.id}`} className="text-sm sm:text-lg md:text-2xl">{data.updateAt}</Link>
                                        </td>
                                        <td className="p-2">
                                            <Link href={`/user/board/${data.id}`} className="text-sm sm:text-lg md:text-2xl">{data.owner}</Link>
                                        </td>
                                    </tr>
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
                        <ContextMenuWrapper key={index}>
                            <Link href={`/user/board/${data.id}`}>
                                <div key={index} className="p-3 sm:p-6 md:p-10 hover:cursor-pointer hover:bg-slate-100 hover:scale-105 hover:-rotate-1 h-auto flex flex-col">
                                    <img src={data.thumbnail} alt="thumbnail" className="w-full aspect-square object-cover flex-1 rounded-sm" />
                                    <div className="mt-2">
                                        <p className="text-base sm:text-xl md:text-2xl font-bold truncate">{data.name}</p>
                                        <p className="text-xs sm:text-sm md:text-lg font-light truncate">{data.description}</p>
                                    </div>
                                </div>
                            </Link>
                        </ContextMenuWrapper>
                    ))
                }
            </div>
        );
    }
    
    return (
        <div>
            {/* Other view modes can be implemented here */}
        </div>
    );
}

export default ListBoardOfUser;
