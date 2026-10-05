import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { useToolDevStore } from "@/lib/Zustand/store";
import { isLine } from "./hitTest";
import { sceneSocket } from "./sceneSocket";
import type { ElementStyle } from "./types";

const FILLS = ["none", "#ffffff", "#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#e9d5ff", "#fed7aa", "#e5e7eb"];
const STROKES = ["#111827", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#6b7280"];
const WIDTHS = [1, 2, 4, 8];

// Chỉnh màu / viền cho shape đang chọn; đồng thời nhớ làm style mặc định cho shape vẽ tiếp theo
const StylePanel = ({ boardId }: { boardId: string }) => {
  const selection = useSceneStore((s) => s.selection);
  const el = useSceneStore((s) => (s.selection.length === 1 ? s.elements[s.selection[0]] : undefined));
  const editingId = useSceneStore((s) => s.editingId);
  if (!el || editingId || (el.type !== "shape" && el.type !== "connector") || selection.length !== 1) return null;

  const apply = (style: ElementStyle) => {
    const next = { ...el.style, ...style };
    sceneSocket.patch(boardId, [{ id: el.id, set: { style: next } }]);
    if (el.type === "shape") useToolDevStore.getState().setShapeStyle(style);
  };
  const st = useSceneStore.getState();
  const showFill = el.type === "shape" && !isLine(el);

  const swatch = (color: string, active: boolean, onClick: () => void) => (
    <button
      key={color}
      onClick={onClick}
      title={color}
      className={`w-6 h-6 rounded border-2 ${active ? "border-blue-600" : "border-gray-300"}`}
      style={
        color === "none"
          ? { background: "linear-gradient(to top right, #fff 45%, #ef4444 50%, #fff 55%)" }
          : { backgroundColor: color }
      }
    />
  );

  return (
    <div
      className="fixed top-24 left-1/2 -translate-x-1/2 z-40 bg-white rounded-xl shadow-lg border px-3 py-2 flex items-center gap-3 text-xs"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {showFill && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 mr-1">Fill</span>
          {FILLS.map((c) => swatch(c, (el.style?.fill ?? "#ffffff") === c, () => apply({ fill: c })))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="text-gray-500 mr-1">Stroke</span>
        {STROKES.map((c) => swatch(c, (el.style?.stroke ?? "#111827") === c, () => apply({ stroke: c })))}
      </div>
      <div className="flex items-center gap-1">
        {WIDTHS.map((wd) => (
          <button
            key={wd}
            onClick={() => apply({ strokeWidth: wd })}
            className={`px-2 py-1 rounded border ${(el.style?.strokeWidth ?? 2) === wd ? "border-blue-600" : "border-gray-300"}`}
          >
            {wd}px
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button className="px-2 py-1 rounded border border-gray-300" onClick={() => sceneSocket.patch(boardId, [{ id: el.id, set: { z: st.topZ() + 1 } }])}>
          Front
        </button>
        <button className="px-2 py-1 rounded border border-gray-300" onClick={() => sceneSocket.patch(boardId, [{ id: el.id, set: { z: st.bottomZ() - 1 } }])}>
          Back
        </button>
      </div>
    </div>
  );
};

export default StylePanel;
