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
import ResizableDraggableBox from "@/app/_components/DraggableResizableBox"
interface ILayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isAIGenerationPopupVisible, setIsPopupVisible] = useState(false);
  const [textItemCount, setTextItemCount] = useState(0);
  const onClickAIButton = () => {
    setIsPopupVisible(!isAIGenerationPopupVisible);
  };

  const onClickCursorButton = () => {

  }
  const onClickTextButton = () => {
    console.log("click create text");
    setTextItemCount(textItemCount+1);

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
    <div className="relative w-full h-full">
     
      {/* Main Content */}
      <div className="relative w-full h-full p-4 z-10">{children}</div>
    </div>
  );
};

export default Layout;
