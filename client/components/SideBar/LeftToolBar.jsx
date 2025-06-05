"use client";
import { getShapeByIndex } from "@/components/ui/CustomShape";
import AIGenerationPopup from "@/components/ui/Panel_Popup/AIGenerationPopup";
import ToolBarBtn from "@/components/ui/WhiteBoardLeftToolBarBtn";
import { useState } from "react";
import {
  FaEraser,
  FaHighlighter,
  FaPen,
  FaRegCircle,
  FaRegStar,
  FaRegStickyNote,
} from "react-icons/fa";
import { HiMiniSparkles } from "react-icons/hi2";
import { IoColorFillSharp, IoTriangleOutline } from "react-icons/io5";
import { LuShapes } from "react-icons/lu";
import { MdGrid4X4, MdOutlineRectangle } from "react-icons/md";
import { PiHandGrabbingFill } from "react-icons/pi";
import { RxThickArrowLeft, RxThickArrowRight } from "react-icons/rx";

import { FaDotCircle } from "react-icons/fa";

import { useBoardStoreof, useToolDevStore } from "@/lib/Zustand/store";
import { ImagePlus } from "lucide-react";
import ImageTool from "./ImageTool";

// Color mapping between simple names and tailwind classes
const colorMapping = {
  blue: "bg-blue-500",
  red: "bg-red-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  gray: "bg-gray-500",
  orange: "bg-orange-500",
  lime: "bg-lime-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  fuchsia: "bg-fuchsia-500",
  zinc: "bg-zinc-500",
  neutral: "bg-neutral-500",
  slate: "bg-slate-500",
  stone: "bg-stone-500",
  amber: "bg-amber-500",
  black: "bg-black",
  white: "bg-white",
};

// Update sticky note colors to use simple names
const stickyNoteColor = [
  "blue",
  "red",
  "green",
  "yellow",
  "purple",
  "pink",
  "teal",
  "indigo",
  "gray",
  "orange",
  "lime",
  "rose",
  "cyan",
  "emerald",
  "sky",
  "violet",
  "fuchsia",
  "zinc",
  "neutral",
  "slate",
  "stone",
  "amber",
  "black",
  "white",
];

const penColors = [
  "#ff0000",
  "#00ff00",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#000000",
  "#ffffff", // Primary colors
  "#ff4500",
  "#32cd32",
  "#1e90ff",
  "#ffa500",
  "#800080",
  "#008080",
  "#808080",
  "#f5f5f5", // Secondary and neutral colors
  "#ff6347",
  "#adff2f",
  "#4682b4",
  "#ff1493",
  "#6a5acd",
  "#20b2aa",
  "#2f4f4f",
  "#dcdcdc", // Muted color
];

const backgroundColors = [
  "bg-red-700",
  "bg-green-700",
  "bg-blue-700",
  "bg-yellow-700",
  "bg-purple-700",
  "bg-pink-700",
  "bg-teal-700",
  "bg-indigo-700",
  "bg-gray-700",
  "bg-orange-700",
  "bg-lime-700",
  "bg-rose-700",
  "bg-cyan-700",
  "bg-emerald-700",
  "bg-sky-700",
  "bg-violet-700",
  "bg-fuchsia-700",
  "bg-zinc-700",
  "bg-neutral-700",
  "bg-slate-700",
  "bg-stone-700",
  "bg-amber-700",
];

const LeftToolBar = ({ onClickStickyNoteButton, onClickShape }) => {
  // get state from zustand store
  const ModeTool = useToolDevStore((state) => state.mode);
  const setMode = useToolDevStore((state) => state.setMode);
  const setGridVisible = useBoardStoreof((state) => state.setGridVisible);
  const setBoardColor = useBoardStoreof((state) => state.setBoardColor);
  // local state
  const [isAIGenerationPopupVisible, setIsPopupVisible] = useState(false);
  const [isSelectNotePopupVisible, setIsSelectNotePopupVisible] =
    useState(false);
  const [isSelectBackgroundVisible, setIsSelectBackgroundVisible] =
    useState(false);
  const [isSelectShapeVisible, setIsSelectShapeVisible] = useState(false);
  const [isSelectPenVisible, setIsSelectPenVisible] = useState(false);
  const [visibleImageTool, setVisibleImageTool] = useState(false);

  const [isPenConfigPopupVisible, setIsPenConfigPopupVisible] = useState(false);

  const penThickness = useToolDevStore((state) => state.pencil?.thickness);
  const setPenThickness = useToolDevStore(
    (state) => state.pencil?.setThickness
  );
  const penColor = useToolDevStore((state) => state.pencil?.color);
  const setPenColor = useToolDevStore((state) => state.pencil?.setColor);
  const setHighlightPen = useToolDevStore((state) => state.pencil.setOpacity);

  const onClickAIButton = () => {
    setIsPopupVisible(!isAIGenerationPopupVisible);
  };

  const OnClickPiHandGrabbingFillButton = () => {
    resetSelectPopup();
    if (ModeTool == "drag") setMode("idle");
    else setMode("drag");
  };

  // const onClickCreateTextButton = () => {
  //   resetSelectPopup();
  //   onClickTextButton();
  // };

  const onClickNoteButton = () => {
    resetSelectPopup();
    setIsSelectNotePopupVisible(!isSelectNotePopupVisible);
  };

  const onClickShapeButton = () => {
    resetSelectPopup();
    setIsSelectShapeVisible(!isSelectShapeVisible);
  };

  const handleClickVisibleGridButton = () => {
    setGridVisible();
  };

  const onClickBackgroundButton = () => {
    resetSelectPopup();
    setIsSelectBackgroundVisible(!isSelectBackgroundVisible);
  };

  const onClickPenVisibleButton = () => {
    resetSelectPopup();
    setIsSelectPenVisible(!isSelectPenVisible);
    setIsPenConfigPopupVisible(false);
    setMode("idle");
  };

  const handleClickPenButton = () => {
    setIsSelectPenVisible(!isSelectPenVisible);
    setIsPenConfigPopupVisible(false);
    setMode("pen");
    setHighlightPen(1);
  };

  const handleClickHighlightButton = () => {
    setIsSelectPenVisible(!isSelectPenVisible);
    setIsPenConfigPopupVisible(false);
    setMode("pen");
    setHighlightPen(0.5);
  };

  const handleClickEraserButton = () => {
    setIsSelectPenVisible(!isSelectPenVisible);
    setMode("eraser");
  };

  const handleThicknessChange = (e) => {
    setPenThickness(e.target.value);
  };

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
    onClickStickyNoteButton(colorMapping[stickyNoteColor[i]]);
    setIsSelectNotePopupVisible(false);
  };

  const onSelectShape = (i) => {
    onClickShape(getShapeByIndex(i));
    resetSelectPopup();
  };

  const onClickImageIcon = () => {
    resetSelectPopup();
    setVisibleImageTool(!visibleImageTool);
  };
  const onTogglePenConfigPopup = () => {
    setIsPenConfigPopupVisible(!isPenConfigPopupVisible);
  };

  const resetSelectPopup = () => {
    setIsSelectNotePopupVisible(false);
    setIsSelectShapeVisible(false);
    setIsSelectPenVisible(false);
    setVisibleImageTool(false);
    setIsSelectBackgroundVisible(false);
    setIsPenConfigPopupVisible(false);
  };

  const handlePenColorChange = (color) => {
    setPenColor(color);
  };

  const onClickBackgroundColor = (color) => {
    setBoardColor(color);
  };

  return (
    <div className="relative w-0 h-0">
      <div
        className={`fixed top-[60px] w-[300px] h-full flex flex-row items-center text-white transform ${
          isAIGenerationPopupVisible ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out z-40`}
      >
        <AIGenerationPopup togglePopup={onClickAIButton} />

        {/* toolbar container */}
        <div className="bg-red-900 w-0 h-fit transform translate-x-full pr-[10px]">
          <ToolBarBtn onclick={onClickAIButton} icon={HiMiniSparkles} />
          <ToolBarBtn
            onclick={OnClickPiHandGrabbingFillButton}
            icon={PiHandGrabbingFill}
            isChoosing={ModeTool == "drag"}
          />
          <ToolBarBtn onclick={onClickNoteButton} icon={FaRegStickyNote} />
          <ToolBarBtn onclick={onClickImageIcon} icon={ImagePlus} />
          <ToolBarBtn onclick={onClickShapeButton} icon={LuShapes} />
          <ToolBarBtn onclick={handleClickVisibleGridButton} icon={MdGrid4X4} />
          <ToolBarBtn
            onclick={onClickBackgroundButton}
            icon={IoColorFillSharp}
          />
          <ToolBarBtn onclick={onClickPenVisibleButton} icon={FaPen} />
        </div>

        {
          // select background color
          <div
            className={`bg-red-900 w-0 ${
              isSelectBackgroundVisible ? "h-[500px]" : "h-0"
            } transition-all duration-300`}
          >
            <div className="w-[100px]  overflow-y-hidden h-full bg-gray-900 transform translate-x-1/2 ">
              <div className="grid grid-cols-2 gap-2 p-2">
                {backgroundColors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => onClickBackgroundColor(color)}
                    className={`inline-flex items-center px-3 py-2 rounded text-white ${color}`}
                  >
                    Color {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }

        {/* select sticky note color */}
        <div
          className={` w-0 ${
            isSelectNotePopupVisible ? "h-[500px]" : "h-0"
          } transition-all duration-300`}
        >
          <div className="w-[100px]  overflow-y-hidden h-full bg-gray-900 transform translate-x-1/2 ">
            <div className="grid grid-cols-2 gap-2 p-2">
              {stickyNoteColor.map((color, i) => (
                <button
                  key={i}
                  onClick={() => onSelectNoteColor(i)}
                  className={`inline-flex items-center px-3 py-2 rounded text-white ${colorMapping[color]}`}
                >
                  Color {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={` w-0 ${
            visibleImageTool ? "h-[600px]" : "h-0"
          } transition-all duration-300`}
        >
          <ImageTool />
        </div>

        {/* select shape */}
        <div
          className={` w-0 ${
            isSelectShapeVisible ? "h-[200px]" : "h-0"
          } transition-all duration-300`}
        >
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
        <div
          className={`bg-red-900 w-0 h-0 relative flex justify-center items-center`}
        >
          <div
            className={`absolute left-[50px] w-[50px] overflow-y-hidden  ${
              isSelectPenVisible ? "h-[300px]" : "h-0"
            } bg-gray-900 flex flex-col justify-center items-center transition-all duration-300`}
          >
            <div className="grid grid-cols-1 gap-1 p-1 w-fit justify-center items-center">
              <button
                className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700"
                onClick={handleClickPenButton}
              >
                <FaPen className="w-10 h-10" />
              </button>
              <button
                className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700"
                onClick={handleClickHighlightButton}
              >
                <FaHighlighter className="w-10 h-10" />
              </button>
              <button
                className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700"
                onClick={handleClickEraserButton}
              >
                <FaEraser className="w-10 h-10" />
              </button>
              <button
                onClick={onTogglePenConfigPopup}
                className="inline-flex items-center justify-center px-3 py-2 rounded bg-gray-700"
              >
                <FaDotCircle className="w-10 h-10" />
              </button>
            </div>
          </div>
        </div>
        {/* pen configuration */}
        <div className="bg-yellow-300 w-0 h-[100px]">
          <div
            className={`relative left-[110px] w-[200px] overflow-y-hidden ${
              isPenConfigPopupVisible ? "h-[300px] p-4" : "h-0 "
            } bg-gray-900 flex flex-col transition-all duration-300 `}
          >
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
              <div className=" grid grid-cols-4 gap-4 overflow-auto w-full">
                {penColors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => handlePenColorChange(color)}
                    style={{ backgroundColor: color }}
                    className={`w-12 h-12 rounded-full border-2 ${
                      penColor === color ? "border-white" : "border-transparent"
                    }`}
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
