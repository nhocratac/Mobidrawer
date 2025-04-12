"use client"
import { useBoardStoreof } from '@/lib/Zustand/store';
import { useEffect, useRef } from 'react';

const BoardGridContext = ({ menuPosition, isVisible}: {
  menuPosition: { x: number, y: number },
  isVisible: boolean
}) => {
    const ref = useRef<HTMLDivElement>(null)
    const setGridVisible = useBoardStoreof((state) => state.setGridVisible);
    const board = useBoardStoreof((state) => state.board);
    useEffect(() => {
        if (isVisible && ref.current) {
            ref.current.style.top = `${menuPosition.y}px`
            ref.current.style.left = `${menuPosition.x}px`
        }
    },[menuPosition.y, menuPosition.x, isVisible])
    const handleClickVisibleGrid = () => {
      setGridVisible();
    };
    return (
          <div
            ref={ref}
            className="absolute bg-white border rounded-md shadow-lg w-48 py-2"
          >
            <ul className="text-gray-700">
              <li
                className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                onClick={handleClickVisibleGrid}
              >
                {board?.option.grid ? "Tắt" : "Bật"} lưới
              </li>
              <li
                className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => alert("Option 2 selected")}
              >
                Chọn
              </li>
              <li
                className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                onClick={() => alert("Option 3 selected")}
              >
                Vẽ
              </li>
            </ul>
          </div>
    );
}

export default BoardGridContext