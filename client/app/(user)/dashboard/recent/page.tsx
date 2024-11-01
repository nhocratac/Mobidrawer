'use client'


import ListBoardOfUser from "@/app/(user)/dashboard/ListBoardOfUser";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useBoardStore } from "@/lib/Zustand/store";
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

