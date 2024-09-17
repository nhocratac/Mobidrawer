"use client";
import { CursorArrowRaysIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { GiArrowCursor } from "react-icons/gi";
import { HiMiniSparkles } from "react-icons/hi2";
import { RiText } from "react-icons/ri";
import { FaRegStickyNote } from "react-icons/fa";
import { LuShapes } from "react-icons/lu";
import { ImArrowUpRight2 } from "react-icons/im";
import { FaPen } from "react-icons/fa";
import { useState } from "react";
import AIGenerationPopup from "@/app/_components/AIGenerationPopup"
import BoardHeader from "@/app/_components/BoardHeader"
import ToolBarBtn from "@/app/_components/LeftToolBarBtn"


const LeftToolBar = ({ 
    onClickTextButton = ()=>{}, 
    onClickStickyNoteButton = (color)={},
}) => {
    const [isAIGenerationPopupVisible, setIsPopupVisible] = useState(false);
    const [isSelectNotePopupVisible, setIsSelectNotePopupVisible] = useState(false);

    const onClickAIButton = () => {
        setIsPopupVisible(!isAIGenerationPopupVisible);
    };

    const onClickNoteButton = () => {
        setIsSelectNotePopupVisible(!isSelectNotePopupVisible);
    }
    const colors = [
        'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500',
        'bg-gray-500', 'bg-orange-500', 'bg-lime-500', 'bg-rose-500',
        'bg-cyan-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500',
        'bg-fuchsia-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-slate-500',
        'bg-stone-500', 'bg-amber-500'
    ];

const onSelectNoteColor=(i)=>{
    onClickStickyNoteButton(colors[i])
    setIsSelectNotePopupVisible(false)
}

    return (
        <div className="relative w-0 h-0">
            {/* Header */}
            <BoardHeader />

            <div
                className={`fixed top-[60px] w-[300px] h-full  flex flex-row items-center  text-white transform ${isAIGenerationPopupVisible ? "translate-x-0" : "-translate-x-full"
                    } transition-transform duration-300 ease-in-out z-40`}
            >
                <AIGenerationPopup togglePopup={onClickAIButton} />

                {/* toolbar container */}
                <div className=" bg-red-900 w-0 h-fit transform translate-x-full pr-[10px] ">
                    <ToolBarBtn onclick={onClickAIButton} icon={HiMiniSparkles} />
                    <ToolBarBtn onclick={onClickTextButton} icon={GiArrowCursor} />
                    <ToolBarBtn onclick={onClickTextButton} icon={RiText} />
                    <ToolBarBtn onclick={onClickNoteButton} icon={FaRegStickyNote} />
                    <ToolBarBtn onclick={onClickTextButton} icon={LuShapes} />
                    <ToolBarBtn onclick={onClickTextButton} icon={ImArrowUpRight2} />
                    <ToolBarBtn onclick={onClickTextButton} icon={FaPen} />

                </div>
                <div
                    className={`bg-red-900 w-0 ${isSelectNotePopupVisible ? 'h-[500px]' : 'h-0'} transition-all duration-300 `}
                >
                    <div className="w-[100px] h-full bg-gray-900 transform translate-x-1/2 overflow-y-auto ">
                        <div className="grid grid-cols-2 gap-2 p-2">
                            {Array.from({ length: 22 }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={()=>onSelectNoteColor(i)}
                                    className={`inline-flex items-center px-3 py-2 rounded text-white ${colors[i % colors.length]}`}
                                >
                                    Color {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>


            </div>


        </div>
    );
};

export default LeftToolBar;
