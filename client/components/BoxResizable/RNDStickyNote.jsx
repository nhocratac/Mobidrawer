import React from 'react';
import { Rnd } from 'react-rnd';
import Linker from "@/components/BoxResizable/Linker"
const handleStyles = {
  topLeft: 'cursor-nw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] left-[-5px]',
  topRight: 'cursor-ne-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] right-[-5px]',
  bottomLeft: 'cursor-sw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] left-[-5px]',
  bottomRight: 'cursor-se-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] right-[-5px]',
 
};

const Box = ({ colorString = 'bg-transparent' }) => (
    <div className="box m-0 w-full h-full p-0 flex justify-center items-center overflow-hidden">
      <textarea
        className={`w-full h-full text-center text-[16px] ${colorString}`}
        defaultValue={"type here"}
      >
      </textarea>
    </div>
  );
  
const RNDStickyNote = ({ parentScale,colorString }) => (
  
 <Rnd
    default={{
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    }}
  
    bounds="window"
    minWidth={200}
    minHeight={200}
    className="border-2 border-black relative"
    scale={parentScale}
    enableResizing={{
      top: true,
      right: true,
      bottom: true,
      left: true,
      topRight: true,
      bottomRight: true,
      bottomLeft: true,
      topLeft: true,
    }}
   
  >
    <Box colorString={colorString} />
    <div className="resize-handles">
      <div className={handleStyles.topLeft}></div>
      <div className={handleStyles.topRight}></div>
      <div className={handleStyles.bottomLeft}></div>
      <div className={handleStyles.bottomRight}></div>


      
    </div>
    <Linker/>
  </Rnd>
 



 
);

export default RNDStickyNote;
