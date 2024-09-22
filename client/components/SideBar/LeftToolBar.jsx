"use client";
import { GiArrowCursor } from "react-icons/gi";
import { HiMiniSparkles } from "react-icons/hi2";
import { RiText } from "react-icons/ri";
import { FaRegStickyNote, FaRegCircle, FaRegStar } from "react-icons/fa";
import { LuShapes } from "react-icons/lu";
import { ImArrowUpRight2 } from "react-icons/im";
import { FaPen } from "react-icons/fa";
import { MdOutlineRectangle } from "react-icons/md";
import { IoTriangleOutline } from "react-icons/io5";
import { RxThickArrowRight, RxThickArrowLeft } from "react-icons/rx";
import { useState } from "react";
import AIGenerationPopup from "@/components/ui/Panel_Popup/AIGenerationPopup";
import BoardHeader from "@/components/header/WhiteBoardHeader";
import ToolBarBtn from "@/components/ui/WhiteBoardLeftToolBarBtn";
import Shapes from "@/components/ui/CustomShape";
import { getShapeByIndex } from "@/components/ui/CustomShape";
import { CircleDashed } from 'lucide-react'
import InputRange from "../ui/InputRange";
const LeftToolBar = ({
    onClickTextButton = () => { },
    onClickStickyNoteButton = (color) => { },
    onClickShape = (shape) => { },
}) => {
    const [isAIGenerationPopupVisible, setIsPopupVisible] = useState(false);
    const [isSelectNotePopupVisible, setIsSelectNotePopupVisible] = useState(false);
    const [isSelectShapeVisible, setIsSelectShapeVisible] = useState(false);
    const [isSelectPenVisible, setIsSelectPenVisible] = useState(false);

    const onClickAIButton = () => {
        setIsPopupVisible(!isAIGenerationPopupVisible);
    };

    const onClickNoteButton = () => {
        resetSelectPopup();
        setIsSelectNotePopupVisible(!isSelectNotePopupVisible);
    };

    const onClickShapeButton = () => {
        resetSelectPopup();
        setIsSelectShapeVisible(!isSelectShapeVisible);
    };
    const onClickCreateTextButton = (colorName) => {
        resetSelectPopup();
        onClickTextButton();
    }
    const onClickPenButton = () => {
        resetSelectPopup();
        setIsSelectPenVisible(!isSelectPenVisible);
    }


    const colors = [
        'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500',
        'bg-gray-500', 'bg-orange-500', 'bg-lime-500', 'bg-rose-500',
        'bg-cyan-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500',
        'bg-fuchsia-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-slate-500',
        'bg-stone-500', 'bg-amber-500'
    ];

    const shapeIcons = [
        MdOutlineRectangle,
        IoTriangleOutline,
        FaRegCircle,
        FaRegStar,
        RxThickArrowRight,
        RxThickArrowLeft,
    ];

    const onSelectNoteColor = (i) => {
        resetSelectPopup();
        onClickStickyNoteButton(colors[i]);
        setIsSelectNotePopupVisible(false);
    };

    const onSelectShape = (i) => {

        onClickShape(getShapeByIndex(i));
        resetSelectPopup();
    };

    const resetSelectPopup = () => {
        setIsSelectNotePopupVisible(false);
        setIsSelectShapeVisible(false);
    }

    return (
        <div className="relative w-0 h-0">
            {/* Header */}
            <BoardHeader />

            <div
                className={`fixed top-[60px] w-[300px] h-full flex flex-row items-center text-white transform ${isAIGenerationPopupVisible ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out z-40`}
            >
                <AIGenerationPopup togglePopup={onClickAIButton} />

                {/* toolbar container */}
                <div className="bg-red-900 w-0 h-fit transform translate-x-full pr-[10px]">
                    <ToolBarBtn onclick={onClickAIButton} icon={HiMiniSparkles} />
                    <ToolBarBtn onclick={null} icon={GiArrowCursor} />
                    <ToolBarBtn onclick={onClickCreateTextButton} icon={RiText} />
                    <ToolBarBtn onclick={onClickNoteButton} icon={FaRegStickyNote} />
                    <ToolBarBtn onclick={onClickShapeButton} icon={LuShapes} />
                    <ToolBarBtn onclick={null} icon={ImArrowUpRight2} />
                    <ToolBarBtn onclick={onClickPenButton} icon={FaPen} />
                </div>

                {/* select sticky note color */}
                <div className={`bg-red-900 w-0 ${isSelectNotePopupVisible ? 'h-[500px]' : 'h-0'} transition-all duration-300`}>
                    <div className="w-[100px] h-full bg-gray-900 transform translate-x-1/2 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2 p-2">
                            {colors.map((color, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSelectNoteColor(i)}
                                    className={`inline-flex items-center px-3 py-2 rounded text-white ${color}`}
                                >
                                    Color {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* select shape */}
                <div className={`bg-red-900 w-0 ${isSelectShapeVisible ? 'h-[200px]' : 'h-0'} transition-all duration-300`}>
                    <div className="w-[100px] h-full bg-gray-900 transform translate-x-1/2 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2 p-2">
                            {shapeIcons.map((Icon, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSelectShape(i)}
                                    className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700"
                                >
                                    <Icon className="w-10 h-10" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className={`bg-red-900 w-0 ${isSelectPenVisible ? 'h-[200px]' : 'h-0'} transition-all duration-300`}>
                    <div className="w-[100px] h-full bg-gray-900 transform translate-x-1/2 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2 p-2">
                            <button
                                className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700"
                            >
                                <FaPen className="w-10 h-10" />
                            </button>
                            <button
                                className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700"
                            >
                                <CircleDashed className="w-10 h-10" />
                            </button>
                            <div id='input-range-line-wide' className="">
                                <InputRange label='wide line' min={6}  max={50} defaultValue={5} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeftToolBar;
