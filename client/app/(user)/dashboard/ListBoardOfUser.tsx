import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useBoardStore } from "@/lib/Zustand/store";
import { useEffect, useState } from "react";

interface Board {
    id: string;
    name: string;
    thumnail?: string;
    description?: string;
    owner?: string;
    members?: string[];
}

interface ListBoardOfUserProps {
    boardList?: Board[];
    modeView: string;
    [key: string]: any;
}

const tableData = [
    {
        id: '1',
        thumnail: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_30.png?etag=20230906',
        name: 'IE104',
        description: 'This is a board for IE104 class',
        lastOpened: '2 days ago',
        owner: 'you',
    },
    {
        id: '2',
        thumnail: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_18.png?etag=20230906',
        name: 'IE105',
        description: 'This is a board for IE105 class',
        lastOpened: '3 days ago',
        owner: 'you',
    },
    {
        id: '3',
        thumnail: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
        name: 'IE106',
        description: 'This is a board for IE106 class',
        lastOpened: '4 days ago',
        owner: 'you',
    },

    {
        id: '3',
        thumnail: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
        name: 'IE106',
        description: 'This is a board for IE106 class',
        lastOpened: '4 days ago',
        owner: 'you',
    },
    {
        id: '3',
        thumnail: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
        name: 'IE106',
        description: 'This is a board for IE106 class',
        lastOpened: '4 days ago',
        owner: 'you',
    },
    {
        id: '3',
        thumnail: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
        name: 'IE106',
        description: 'This is a board for IE106 class',
        lastOpened: '4 days ago',
        owner: 'you',
    },

];

function ContextMenuWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Profile</ContextMenuItem>
                <ContextMenuItem>Billing</ContextMenuItem>
                <ContextMenuItem>Team</ContextMenuItem>
                <ContextMenuItem>Subscription</ContextMenuItem>
                <ContextMenuItem>Rename</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>

    )
}

function ListBoardOfUser({ boardList = tableData, modeView, ...props }: ListBoardOfUserProps) {
    const [isMounted, setIsMounted] = useState(false);
    const ListBoard = useBoardStore(state => state.boards)

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // Trả về null hoặc một loading state
    }
    if (modeView === 'List') {
        return (
            <div className="px-12  w-full flex-1 overflow-y-auto">
                <table className="w-full">
                    <thead>
                        <tr className="font-light text-2xl text-left">
                            <th className="w-2/5">Name</th>
                            <th className="w-[15%]">Online User</th>
                            <th className="w-[15%]">Space</th>
                            <th className="w-[15%]">Last Opened</th>
                            <th className="w-[15%]">Owner</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            ListBoard.map((data, index) => (

                                <tr className="p-10 hover:cursor-pointer hover:bg-slate-100" key={index}>
                                    <td className="flex">
                                        <ContextMenuWrapper>
                                            <div className="flex">
                                                <img src={data.thumbnail} alt="thumbnail" className="w-[56px] h-[56px]" />
                                                <div className="h-[56px] ml-2"> {/* Added margin-left for spacing */}
                                                    <p className="text-2xl font-bold">{data.name}</p>
                                                    <p className='text-lg font-light'>{data.description}</p>
                                                </div>
                                            </div>
                                        </ContextMenuWrapper>
                                    </td>
                                    <td className="text-2xl">0</td>
                                    <td className="text-2xl">0</td>
                                    <td className="text-2xl">{data.lastOpened}</td>
                                    <td className="text-2xl">{data.owner}</td>

                                </tr>

                            ))
                        }
                    </tbody>
                </table>
            </div>
        );
    }
    if (modeView === 'Grid') {
        return (
            <div className="grid grid-cols-5 gap-4 px-12 flex-1 overflow-y-auto ">
                {
                    ListBoard.map((data, index) => (
                        <ContextMenuWrapper>
                            <div key={index} className=" p-10 hover:cursor-pointer hover:bg-slate-100 hover:scale-105 hover:-rotate-1 h-auto flex flex-col item">
                                <img src={data.thumbnail} alt="thumbnail" className="w-[100%] h-[100%] flex-1" />
                                <div>
                                    <p className="text-2xl font-bold">{data.name}</p>
                                    <p className='text-lg font-light'>{data.description}</p>
                                </div>
                            </div>
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
