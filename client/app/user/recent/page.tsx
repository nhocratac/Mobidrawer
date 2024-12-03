'use client'


import ListBoardOfUser from "@/components/dashboard/ListBoardOfUser";
import { LayoutGrid, LayoutList } from "lucide-react";
import {  useState } from "react";


export default function RencentPage() {
    const [modeView, setModeView] = useState('List');
    return (
        <div className="flex flex-1 flex-col justify-between items-center gap-8 ">
            <div className="w-full flex justify-between">
                <div>
                    <div className="text-5xl " >Gần đây</div>
                    <div className="text-xl">Các bảng mở gần đây</div>
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

