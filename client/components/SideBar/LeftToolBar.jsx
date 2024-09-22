"use client";
import { GiArrowCursor } from "react-icons/gi";
import { HiMiniSparkles } from "react-icons/hi2";
import { RiText } from "react-icons/ri";
import { FaRegStickyNote, FaRegCircle, FaRegStar, FaHighlighter, FaEraser } from "react-icons/fa";
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
import { FaDotCircle } from "react-icons/fa";
const LeftToolBar = ({
    onClickTextButton = () => { },
    onClickStickyNoteButton = (color) => { },
    onClickShape = (shape) => { },
}) => {
    const [isAIGenerationPopupVisible, setIsPopupVisible] = useState(false);
    const [isSelectNotePopupVisible, setIsSelectNotePopupVisible] = useState(false);
    const [isSelectShapeVisible, setIsSelectShapeVisible] = useState(false);
    const [isSelectPenVisible, setIsSelectPenVisible] = useState(false);
    const [isPenConfigPopupVisible, setIsPenConfigPopupVisible] = useState(false);

    const [penThickness, setPenThickness] = useState(5);
    const [penColor, setPenColor] = useState('#000000');

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
    const onClickPenButton = () => {
        resetSelectPopup();
        setIsSelectPenVisible(!isSelectPenVisible);
    };
    const onClickCreateTextButton = (colorName) => {
        resetSelectPopup();
        onClickTextButton();
    }
    const handleThicknessChange = (e) => {
        setPenThickness(e.target.value);
    };

    const stickyNoteColor = [
        'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500',
        'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500',
        'bg-gray-500', 'bg-orange-500', 'bg-lime-500', 'bg-rose-500',
        'bg-cyan-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500',
        'bg-fuchsia-500', 'bg-zinc-500', 'bg-neutral-500', 'bg-slate-500',
        'bg-stone-500', 'bg-amber-500'
    ];
    const penColors = [
        '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffffff', // Primary colors
        '#ff4500', '#32cd32', '#1e90ff', '#ffa500', '#800080', '#008080', '#808080', '#f5f5f5', // Secondary and neutral colors
        '#ff6347', '#adff2f', '#4682b4', '#ff1493', '#6a5acd', '#20b2aa', '#2f4f4f', '#dcdcdc', // Muted colors


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
        onClickStickyNoteButton(stickyNoteColor[i]);
        setIsSelectNotePopupVisible(false);
    };

    const onSelectShape = (i) => {

        onClickShape(getShapeByIndex(i));
        resetSelectPopup();
    };
    const onTogglePenConfigPopup = () => {
        setIsPenConfigPopupVisible(!isPenConfigPopupVisible);

    };

    const resetSelectPopup = () => {
        setIsSelectNotePopupVisible(false);
        setIsSelectShapeVisible(false);
        setIsSelectPenVisible(false);
    }


    const handlePenColorChange = (color) => {
        setPenColor(color)
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
                    <div className="w-[100px]  overflow-y-hidden h-full bg-gray-900 transform translate-x-1/2 ">
                        <div className="grid grid-cols-2 gap-2 p-2">
                            {stickyNoteColor.map((color, i) => (
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
                    <div className="w-[100px] h-full overflow-y-hidden bg-gray-900 transform translate-x-1/2 ">
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

                {/* select pen */}
                <div className={`bg-red-900 w-0 h-0 relative flex justify-center items-center`}>
                    <div className={`absolute left-[50px] w-[50px] overflow-y-hidden  ${isSelectPenVisible ? 'h-[300px]' : 'h-0'} bg-gray-900 flex flex-col justify-center items-center transition-all duration-300`}>

                        <div className="grid grid-cols-1 gap-1 p-1 w-fit justify-center items-center">
                            <button className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700">
                                <FaPen className="w-10 h-10" />
                            </button>
                            <button className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700">
                                <FaHighlighter className="w-10 h-10" />
                            </button>
                            <button className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700">
                                <FaEraser className="w-10 h-10" />
                            </button>
                            <button onClick={onTogglePenConfigPopup} className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700">
                                <FaDotCircle className="w-10 h-10" />
                            </button>
                        </div>
                    </div>

                </div>
                {/* pen configuration */}
                <div className="bg-yellow-300 w-0 h-[100px]">
                    <div className={`relative left-[110px] w-[200px] overflow-y-hidden ${isPenConfigPopupVisible ? 'h-[300px] p-4' : 'h-0 ' } bg-gray-900 flex flex-col transition-all duration-300 `}>
                        {/* Thickness Slider */}
                        <div className="w-full mb-6">
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={penThickness}
                                onChange={handleThicknessChange}
                                className="w-full mt-2"
                            />
                        </div>

                        {/* Color Grid */}
                        {/* Pen Color Grid */}
                        <div className="flex justify-center  h-full">
                            <div className=" grid grid-cols-3 gap-10">
                                {penColors.map((color, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handlePenColorChange(color)}
                                        style={{ backgroundColor: color }}
                                        className={`w-12 h-12 rounded-full border-2 ${penColor === color ? 'border-white' : 'border-transparent'}`}
                                    />
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default LeftToolBar;
