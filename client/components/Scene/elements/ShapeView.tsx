import { HIT_TOLERANCE_PX } from "../hitTest";
import ArrowMarker from "./ArrowMarker";
import type { BoardElement } from "../types";

interface Props {
  el: BoardElement;
  editing: boolean;
  scale: number;
}

// rect / ellipse / triangle (vẽ trong hệ local của nhóm); line / arrow vẽ theo toạ độ world
const ShapeView = ({ el, editing, scale }: Props) => {
  const kind = el.shape?.kind ?? "rect";
  const fill = el.style?.fill ?? "#ffffff";
  const stroke = el.style?.stroke ?? "#111827";
  const strokeWidth = el.style?.strokeWidth ?? 2;

  if (kind === "line" || kind === "arrow") {
    const markerId = `arrow-${el.id}`;
    return (
      <>
        {kind === "arrow" && <ArrowMarker id={markerId} color={stroke} />}
        <line x1={el.x} y1={el.y} x2={el.x + el.w} y2={el.y + el.h} stroke="transparent" strokeWidth={(HIT_TOLERANCE_PX * 2) / scale} />
        <line
          x1={el.x}
          y1={el.y}
          x2={el.x + el.w}
          y2={el.y + el.h}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          markerEnd={kind === "arrow" ? `url(#${markerId})` : undefined}
        />
      </>
    );
  }

  const common = { fill: fill === "none" ? "transparent" : fill, stroke, strokeWidth };
  return (
    <>
      {kind === "rect" && <rect width={el.w} height={el.h} rx={4} {...common} />}
      {kind === "ellipse" && <ellipse cx={el.w / 2} cy={el.h / 2} rx={el.w / 2} ry={el.h / 2} {...common} />}
      {kind === "triangle" && <polygon points={`${el.w / 2},0 ${el.w},${el.h} 0,${el.h}`} {...common} />}
      {!editing && el.text && (
        <foreignObject width={el.w} height={el.h} style={{ pointerEvents: "none" }}>
          <div
            className="w-full h-full flex items-center justify-center text-center p-2 whitespace-pre-wrap break-words overflow-hidden select-none"
            style={{ fontSize: el.style?.fontSize ?? 16, color: stroke }}
          >
            {el.text}
          </div>
        </foreignObject>
      )}
    </>
  );
};

export default ShapeView;
