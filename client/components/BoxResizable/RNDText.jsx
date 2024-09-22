import React from 'react';
import { Rnd } from 'react-rnd';

const handleStyles = {
  topLeft: 'cursor-nw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] left-[-5px]',
  topRight: 'cursor-ne-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] right-[-5px]',
  bottomLeft: 'cursor-sw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] left-[-5px]',
  bottomRight: 'cursor-se-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] right-[-5px]',
};

const Box = ({ children }) => (
  <div className="relative m-0 w-full h-full p-0 flex justify-center items-center overflow-hidden">
    <div
      contentEditable
      className="absolute inset-0 bg-transparent text-center text-[16px] flex items-center justify-center "
      style={{
        padding: '0',
        margin: '0',
        overflow: 'hidden',
        lineHeight: '1.5',  // Adjust line-height for vertical alignment
      }}
    >
    </div>
    {children}
  </div>
);

const RNDText = ({ parentScale ,width = 200, height = 30}) => (
  <Rnd
    default={{
      x: 0,
      y: 0,
      width: width,
      height: height,
    }}
    bounds="window"
    minWidth={20}
    minHeight={40}
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
    <Box />
    <div className="resize-handles">
      <div className={handleStyles.topLeft}></div>
      <div className={handleStyles.topRight}></div>
      <div className={handleStyles.bottomLeft}></div>
      <div className={handleStyles.bottomRight}></div>
      

    </div>

    
  </Rnd>
);

export default RNDText;
