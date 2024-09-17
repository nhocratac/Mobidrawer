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


const LeftToolBar = ({onClickTextButton}) => {
  const [isAIGenerationPopupVisible, setIsPopupVisible] = useState(false);

  const onClickAIButton = () => {
    setIsPopupVisible(!isAIGenerationPopupVisible);
  };

  const onClickCursorButton = () => {

  }


  const onClickStickyNoteButton = () => {

  }


  const onClickShapeButton = () => {

  }

  const onClicConnectionLineButton = () => {

  }

  const onClickPenButton = () => {

  }





  return (
    <div className="relative w-0 h-0">
      {/* Header */}
      <BoardHeader />

      <div
        className={`fixed top-[60px] w-[300px] h-full bg-slate-800 flex flex-row items-center gap-[10px] text-white transform ${isAIGenerationPopupVisible ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out z-40`}
      >


        <AIGenerationPopup togglePopup={onClickAIButton} />
        {/* toolbar container */}
        <div className=" bg-red-900 w-0 h-fit transform translate-x-full ">
          <ToolBarBtn onclick={onClickAIButton} icon={HiMiniSparkles} />
          <ToolBarBtn onclick={onClickCursorButton} icon={GiArrowCursor} />
          <ToolBarBtn onclick={onClickTextButton} icon={RiText} />
          <ToolBarBtn onclick={onClickStickyNoteButton} icon={FaRegStickyNote} />
          <ToolBarBtn onclick={onClickShapeButton} icon={LuShapes} />
          <ToolBarBtn onclick={onClicConnectionLineButton} icon={ImArrowUpRight2} />
          <ToolBarBtn onclick={onClickPenButton} icon={FaPen} />

          
        </div>
      </div>
      {/* spawned item container */}
   


      {/* Main Content */}
     
    </div>
  );
};

export default LeftToolBar;
