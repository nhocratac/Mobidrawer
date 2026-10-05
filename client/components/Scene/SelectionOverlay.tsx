import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { AABB, anchorPoint, Handle, normBox } from "./geometry";
import { connectorSegment, isLine, lineSegment } from "./hitTest";
import type { Side } from "./types";

const HANDLES: { h: Handle; x: number; y: number; cursor: string }[] = [
  { h: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { h: "n", x: 0.5, y: 0, cursor: "ns-resize" },
  { h: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { h: "e", x: 1, y: 0.5, cursor: "ew-resize" },
  { h: "se", x: 1, y: 1, cursor: "nwse-resize" },
  { h: "s", x: 0.5, y: 1, cursor: "ns-resize" },
  { h: "sw", x: 0, y: 1, cursor: "nesw-resize" },
  { h: "w", x: 0, y: 0.5, cursor: "ew-resize" },
];
const BLUE = "#2563eb";

interface Props {
  scale: number;
  canEdit: boolean;
  pencilBox: AABB | null;
}

const SelectionOverlay = ({ scale, canEdit, pencilBox }: Props) => {
  const selection = useSceneStore((s) => s.selection);
  const elements = useSceneStore((s) => s.elements);
  const editingId = useSceneStore((s) => s.editingId);
  const hs = 10 / scale;
  const sw = 1.5 / scale;
  const single = selection.length === 1 && canEdit && !editingId;

  const endHandle = (key: string, x: number, y: number, attr: Record<string, string>) => (
    <circle key={key} cx={x} cy={y} r={hs / 1.5} fill="#fff" stroke={BLUE} strokeWidth={sw} style={{ cursor: "move" }} {...attr} />
  );

  return (
    <g>
      {selection.map((id) => {
        const el = elements[id];
        if (!el) return null;
        if (el.type === "connector") {
          const seg = connectorSegment(el, elements);
          if (!seg) return null;
          return (
            <g key={id}>
              <line x1={seg[0].x} y1={seg[0].y} x2={seg[1].x} y2={seg[1].y} stroke={BLUE} strokeWidth={sw * 2} strokeOpacity={0.4} pointerEvents="none" />
              {single && endHandle("from", seg[0].x, seg[0].y, { "data-conn-end": "from" })}
              {single && endHandle("to", seg[1].x, seg[1].y, { "data-conn-end": "to" })}
            </g>
          );
        }
        if (isLine(el)) {
          const [a, b] = lineSegment(el);
          return (
            <g key={id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={BLUE} strokeWidth={sw * 2} strokeOpacity={0.4} pointerEvents="none" />
              {single && endHandle("start", a.x, a.y, { "data-handle": "start" })}
              {single && endHandle("end", b.x, b.y, { "data-handle": "end" })}
            </g>
          );
        }
        const b = normBox(el);
        return (
          <g key={id} transform={`translate(${b.x} ${b.y}) rotate(${b.rotation} ${b.w / 2} ${b.h / 2})`}>
            <rect width={b.w} height={b.h} fill="none" stroke={BLUE} strokeWidth={sw} pointerEvents="none" />
            {single && (
              <>
                <line x1={b.w / 2} y1={0} x2={b.w / 2} y2={-24 / scale} stroke={BLUE} strokeWidth={sw} pointerEvents="none" />
                <circle cx={b.w / 2} cy={-24 / scale} r={hs / 1.6} fill="#fff" stroke={BLUE} strokeWidth={sw} data-handle="rotate" style={{ cursor: "grab" }} />
                {HANDLES.map(({ h, x, y, cursor }) => (
                  <rect
                    key={h}
                    x={b.w * x - hs / 2}
                    y={b.h * y - hs / 2}
                    width={hs}
                    height={hs}
                    fill="#fff"
                    stroke={BLUE}
                    strokeWidth={sw}
                    data-handle={h}
                    style={{ cursor }}
                  />
                ))}
              </>
            )}
          </g>
        );
      })}
      {pencilBox && (
        <rect
          x={pencilBox.minX}
          y={pencilBox.minY}
          width={pencilBox.maxX - pencilBox.minX}
          height={pencilBox.maxY - pencilBox.minY}
          fill="none"
          stroke="#000"
          strokeDasharray={`${6 / scale} ${4 / scale}`}
          strokeWidth={sw}
          pointerEvents="none"
        />
      )}
    </g>
  );
};

export default SelectionOverlay;

const SIDES: Side[] = ["top", "right", "bottom", "left"];

// 4 chấm neo để kéo connector ra từ element
export const AnchorDots = ({ id, scale, highlight }: { id: string; scale: number; highlight?: boolean }) => {
  const el = useSceneStore((s) => s.elements[id]);
  if (!el || el.type === "connector") return null;
  return (
    <g>
      {highlight && (
        <rect
          {...(() => {
            const b = normBox(el);
            return { x: b.x, y: b.y, width: b.w, height: b.h, transform: `rotate(${b.rotation} ${b.x + b.w / 2} ${b.y + b.h / 2})` };
          })()}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2 / scale}
          pointerEvents="none"
        />
      )}
      {SIDES.map((side) => {
        const p = anchorPoint({ ...el, kind: el.shape?.kind }, side);
        return (
          <circle
            key={side}
            cx={p.x}
            cy={p.y}
            r={6 / scale}
            fill="#fff"
            stroke="#22c55e"
            strokeWidth={2 / scale}
            data-anchor={side}
            data-anchor-owner={id}
            style={{ cursor: "crosshair" }}
          />
        );
      })}
    </g>
  );
};
