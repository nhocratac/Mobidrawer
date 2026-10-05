import { selectDisplayedElements, useSceneStore } from "@/lib/Zustand/sceneStore";
import { memo } from "react";
import ConnectorView from "./elements/ConnectorView";
import ImageView from "./elements/ImageView";
import ShapeView from "./elements/ShapeView";
import StickyView from "./elements/StickyView";
import { isLine } from "./hitTest";
import type { BoardElement } from "./types";

export const ElementBody = ({ el, editing, locked, scale }: { el: BoardElement; editing: boolean; locked: boolean; scale: number }) => {
  if (el.type === "connector") return <ConnectorView el={el} scale={scale} />;
  if (isLine(el)) {
    return (
      <g data-id={el.id}>
        <ShapeView el={el} editing={editing} scale={scale} />
      </g>
    );
  }
  return (
    <g data-id={el.id} transform={`translate(${el.x} ${el.y}) rotate(${el.rotation} ${el.w / 2} ${el.h / 2})`}>
      {el.type === "sticky" && <StickyView el={el} editing={editing} locked={locked} />}
      {el.type === "image" && <ImageView el={el} />}
      {el.type === "shape" && <ShapeView el={el} editing={editing} scale={scale} />}
    </g>
  );
};

const SceneElement = memo(({ id, scale }: { id: string; scale: number }) => {
  const el = useSceneStore((s) => selectDisplayedElements(s)[id]);
  const editing = useSceneStore((s) => s.editingId === id);
  // lock là trạng thái live, không hiển thị trên bản lịch sử
  const locked = useSceneStore((s) => !s.historyMode && !!s.locks[id]);
  if (!el) return null;
  return <ElementBody el={el} editing={editing} locked={locked} scale={scale} />;
});
SceneElement.displayName = "SceneElement";

export default SceneElement;
