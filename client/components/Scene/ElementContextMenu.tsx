import { exportStickyNoteToPDF } from "@/lib/export";
import { useSceneStore } from "@/lib/Zustand/sceneStore";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { sceneSocket } from "./sceneSocket";

export interface MenuState {
  x: number;
  y: number;
  id: string;
}

const TITLES = { sticky: "Sticky Note", image: "Image", shape: "Shape", connector: "Connector" };

const ElementContextMenu = ({ boardId, menu, canEdit, onClose }: { boardId: string; menu: MenuState; canEdit: boolean; onClose: () => void }) => {
  const el = useSceneStore((s) => s.elements[menu.id]);
  const lock = useSceneStore((s) => s.locks[menu.id]);
  const userId = useTokenStore((s) => s.user?.id);
  if (!el) return null;
  const st = useSceneStore.getState();
  const lockedByOther = !!lock && lock !== userId;

  const item = (label: string, action: () => void, danger = false) => (
    <button
      className={`w-full text-left px-2 py-1 rounded ${danger ? "text-red-600 hover:bg-red-100" : "hover:bg-gray-100"}`}
      onClick={() => {
        onClose();
        action();
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed bg-white shadow-md border rounded-md p-2 text-sm z-50 w-[200px]"
      style={{ top: menu.y, left: menu.x }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="font-bold mb-2">{TITLES[el.type]}</div>
      <div className="mb-1 text-gray-600">
        <div>👤 Owner: {el.owner || "Unknown"}</div>
        <div>🕒 Updated: {el.updateAt ? new Date(el.updateAt).toLocaleString() : "N/A"}</div>
      </div>
      <hr className="my-2" />
      {canEdit && el.type === "sticky" && !lock && item("🔒 Lock", () => sceneSocket.lock(boardId, el.id))}
      {canEdit && el.type === "sticky" && lock === userId && item("🔓 Unlock", () => sceneSocket.unlock(boardId, el.id))}
      {canEdit && !lockedByOther && (el.type === "sticky" || (el.type === "shape" && el.shape?.kind !== "line" && el.shape?.kind !== "arrow")) &&
        item("✏️ Edit text", () => {
          st.setSelection([el.id]);
          st.setEditing(el.id);
        })}
      {el.type === "sticky" &&
        item("🧾 Export PDF", () =>
          exportStickyNoteToPDF({ text: el.text ?? "", color: el.style?.fill ?? "", width: el.w, height: el.h, noteId: el.id })
        )}
      {canEdit && item("⬆️ Bring to front", () => sceneSocket.patch(boardId, [{ id: el.id, set: { z: st.topZ() + 1 } }]))}
      {canEdit && item("⬇️ Send to back", () => sceneSocket.patch(boardId, [{ id: el.id, set: { z: st.bottomZ() - 1 } }]))}
      {canEdit && !lockedByOther && item("🗑 Delete", () => sceneSocket.remove(boardId, [el.id]), true)}
    </div>
  );
};

export default ElementContextMenu;
