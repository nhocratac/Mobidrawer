import { fillToHex } from "../colors";
import type { BoardElement } from "../types";

const StickyView = ({ el, editing, locked }: { el: BoardElement; editing: boolean; locked: boolean }) => (
  <>
    <rect width={el.w} height={el.h} fill={fillToHex(el.style?.fill)} stroke="#000" strokeWidth={2} />
    {!editing && (
      <foreignObject width={el.w} height={el.h} style={{ pointerEvents: "none" }}>
        <div className="w-full h-full p-2 text-[16px] leading-snug text-black whitespace-pre-wrap break-words overflow-hidden select-none">
          {el.text}
        </div>
      </foreignObject>
    )}
    {locked && (
      <foreignObject x={el.w - 80} y={0} width={80} height={24} style={{ pointerEvents: "none" }}>
        <div className="px-1 text-xs bg-lime-700 text-white rounded-bl-xl text-center leading-6">Locking</div>
      </foreignObject>
    )}
  </>
);

export default StickyView;
