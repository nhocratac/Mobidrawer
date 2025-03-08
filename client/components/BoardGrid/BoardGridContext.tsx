"use client"
import { useBoardStore } from '@/lib/Zustand/store';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const BoardGridContext = ({ menuPosition, isVisible}: {
  menuPosition: { x: number, y: number },
  isVisible: boolean
}) => {
    const ref = useRef<HTMLDivElement>(null)
    const { id } = useParams();
    // chuyển id thành số
    const setGridVisible = useBoardStore((state) => state.setGridVisible);
    const boards = useBoardStore((state) => state.boards);
    const currentBoard = boards.find((board) => board.id == +id);
    useEffect(() => {
        if (isVisible && ref.current) {
            ref.current.style.top = `${menuPosition.y}px`
            ref.current.style.left = `${menuPosition.x}px`
        }
    },[menuPosition.y, menuPosition.x, isVisible])
    const handleClickVisibleGrid = () => {
      setGridVisible(+id);
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
                {currentBoard?.options.gird ? "Tắt" : "Bật"} lưới
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