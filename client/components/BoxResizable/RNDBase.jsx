import React from 'react';
import { Rnd } from 'react-rnd';
import RNDText from "@/components/BoxResizable/RNDText"
const handleStyles = {
  topLeft: 'cursor-nw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] left-[-5px]',
  topRight: 'cursor-ne-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] right-[-5px]',
  bottomLeft: 'cursor-sw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] left-[-5px]',
  bottomRight: 'cursor-se-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] right-[-5px]',
};

const Box = ({ children, scale }) => (
    <div className="relative m-0 w-full h-full p-0 flex justify-center items-center overflow-hidden">
      {children}
      <div className="absolute inset-0 flex justify-center items-center">
        <div
          style={{
            width: 150, 
            height: 150, 
          }}
        >
          <RNDText parentScale={scale} width={150} height={150} />
        </div>
      </div>
    </div>
  );
  const RNDBase = ({ parentScale, children}) => (
  <Rnd
    default={{
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    }}
    bounds="window"
    minWidth={20}
    minHeight={20}
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
    <Box children={children} scale={parentScale}/>
    <div className="resize-handles">
      <div className={handleStyles.topLeft}></div>
      <div className={handleStyles.topRight}></div>
      <div className={handleStyles.bottomLeft}></div>
      <div className={handleStyles.bottomRight}></div>
      

    </div>

    
  </Rnd>
);

export default RNDBase;
