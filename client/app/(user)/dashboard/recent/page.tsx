'use client'


import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { LayoutGrid, LayoutList } from "lucide-react";
import { useEffect, useState } from "react";

interface Board {
    id: string;
    name: string;
    linkimage?: string;
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
        linkimage: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_30.png?etag=20230906',
        name: 'IE104',
        description: 'This is a board for IE104 class',
        lastOpened: '2 days ago',
        owner: 'you',
    },
    {
        id: '2',
        linkimage: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_18.png?etag=20230906',
        name: 'IE105',
        description: 'This is a board for IE105 class',
        lastOpened: '3 days ago',
        owner: 'you',
    },
    {
        id: '3',
        linkimage: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
        name: 'IE106',
        description: 'This is a board for IE106 class',
        lastOpened: '4 days ago',
        owner: 'you',
    },

    {
        id: '3',
        linkimage: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
        name: 'IE106',
        description: 'This is a board for IE106 class',
        lastOpened: '4 days ago',
        owner: 'you',
    },
    {
        id: '3',
        linkimage: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
        name: 'IE106',
        description: 'This is a board for IE106 class',
        lastOpened: '4 days ago',
        owner: 'you',
    },
    {
        id: '3',
        linkimage: 'https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906',
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
            </ContextMenuContent>
        </ContextMenu>

    )
}

function ListBoardOfUser({ boardList = tableData, modeView, ...props }: ListBoardOfUserProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // Trả về null hoặc một loading state
    }
    if (modeView === 'List') {
        return (
            <div className="px-12  flex-1 overflow-y-auto w-full">
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
                            tableData.map((data, index) => (

                                <tr className="p-10 hover:cursor-pointer hover:bg-slate-100" key={index}>
                                    <td className="flex">
                                        <ContextMenuWrapper>
                                            <div className="flex">
                                                <img src={data.linkimage} alt="thumbnail" className="w-[56px] h-[56px]" />
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
                    tableData.map((data, index) => (
                        <ContextMenuWrapper>
                            <div key={index} className=" p-10 hover:cursor-pointer hover:bg-slate-100 h-auto flex flex-col item">
                                <img src={data.linkimage} alt="thumbnail" className="w-[100%] h-[100%] flex-1" />
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


export default function page() {
    const [modeView, setModeView] = useState('List');
    return (
        <div className="flex flex-1 flex-col justify-between lg:h-[80px] items-center gap-8">
            <div className="w-full flex justify-between">
                <div>
                    <div className="text-5xl " >Recent</div>
                    <div className="text-xl">In it organization</div>
                </div>
                <div className="flex gap-2">
                    <LayoutGrid className="hover:bg-slate-300" onClick={() => setModeView('Grid')} />
                    <LayoutList className="hover:bg-slate-300" onClick={() => setModeView('List')}/>
                </div>
            </div>
            <ListBoardOfUser modeView={modeView} />
        </div>
    )
}

