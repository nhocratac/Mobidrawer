import React from 'react';
import { Rnd } from 'react-rnd';

const handleStyles = {
  topLeft: 'cursor-nw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] left-[-5px]',
  topRight: 'cursor-ne-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full top-[-5px] right-[-5px]',
  bottomLeft: 'cursor-sw-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] left-[-5px]',
  bottomRight: 'cursor-se-resize w-[10px] h-[10px] absolute bg-white border-2 border-black rounded-full bottom-[-5px] right-[-5px]',
};

const Box = () => (
  <div className="box m-0 h-full p-0 bg-white flex justify-center items-center overflow-hidden">
    <textarea className="w-full h-full bg-slate-500 text-center">text here</textarea>
  </div>
);

const RNDText = ({ parentScale }) => (
  <Rnd
    default={{
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    }}
    bounds="window"
    minWidth={100}
    minHeight={100}
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
