import { selectDisplayedElements, useSceneStore } from "@/lib/Zustand/sceneStore";
import { connectorSegment, HIT_TOLERANCE_PX } from "../hitTest";
import type { BoardElement } from "../types";
import ArrowMarker from "./ArrowMarker";

// Đường nối suy ra từ vị trí hiện tại của 2 element, nên tự bám theo khi chúng di chuyển
const ConnectorView = ({ el, scale }: { el: BoardElement; scale: number }) => {
  const from = useSceneStore((s) => (el.connector ? selectDisplayedElements(s)[el.connector.from.elementId] : undefined));
  const to = useSceneStore((s) => (el.connector ? selectDisplayedElements(s)[el.connector.to.elementId] : undefined));
  if (!from || !to || !el.connector) return null;
  const seg = connectorSegment(el, { [from.id]: from, [to.id]: to });
  if (!seg) return null;
  const [a, b] = seg;
  const stroke = el.style?.stroke ?? "#111827";
  return (
    <g data-id={el.id}>
      <ArrowMarker id={`arrow-${el.id}`} color={stroke} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={(HIT_TOLERANCE_PX * 2) / scale} />
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke={stroke}
        strokeWidth={el.style?.strokeWidth ?? 2}
        markerEnd={`url(#arrow-${el.id})`}
      />
    </g>
  );
};

export default ConnectorView;
