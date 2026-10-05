import { useSceneStore } from "@/lib/Zustand/sceneStore";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { useEffect, useRef, useState } from "react";
import { fillToHex } from "./colors";
import { editLockPlan } from "./editLock";
import { worldToScreen } from "./geometry";
import { sceneSocket } from "./sceneSocket";
import { newObjectId } from "./types";

const TEXT_DEBOUNCE_MS = 500;

// unmount không có onBlur: còn lần gõ chờ debounce, khác lastSent và element còn tồn tại thì phải gửi nốt
export const shouldFlushOnClose = (pending: boolean, value: string, lastSent: string, elementExists: boolean) =>
  pending && elementExists && value !== lastSent;

// <textarea> HTML đặt đúng vị trí element đang sửa (cùng transform + xoay); chỉ mount khi đang sửa
const TextEditOverlay = ({ boardId }: { boardId: string }) => {
  const editingId = useSceneStore((s) => s.editingId);
  if (!editingId) return null;
  return <Editor key={editingId} boardId={boardId} id={editingId} />;
};

const Editor = ({ boardId, id }: { boardId: string; id: string }) => {
  const el = useSceneStore((s) => s.elements[id]);
  const viewport = useSceneStore((s) => s.viewport);
  const [text, setText] = useState(el?.text ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(el?.text ?? "");
  // giá trị đang gõ: reset() thay store và textarea đã detach khi cleanup chạy, nên không đọc lại từ store/DOM
  const typed = useRef(el?.text ?? "");
  // mỗi lần mở ô sửa là một phiên: các lần gõ trong phiên gộp thành một tx trên server
  const [editSessionId] = useState(newObjectId);

  const send = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (value === lastSent.current) return;
    lastSent.current = value;
    sceneSocket.patch(boardId, [{ id, set: { text: value } }], { mergeKey: `text:${id}:${editSessionId}` });
  };

  const me = useTokenStore((s) => s.user?.id);
  const lock = useSceneStore((s) => s.locks[id]);

  useEffect(() => {
    const plan = editLockPlan(useSceneStore.getState().locks[id], me);
    if (!plan.canEdit) {
      useSceneStore.getState().setEditing(null);
      return;
    }
    ref.current?.focus();
    ref.current?.select();
    if (plan.acquire) sceneSocket.lock(boardId, id);
    return () => {
      const pending = timer.current !== null;
      if (timer.current) clearTimeout(timer.current);
      const exists = !!useSceneStore.getState().elements[id];
      if (shouldFlushOnClose(pending, typed.current, lastSent.current, exists)) send(typed.current);
      if (plan.acquire) sceneSocket.unlock(boardId, id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // người khác vừa khoá element này (tranh nhau mở sửa): đóng ô sửa, server đã bỏ qua lock của mình
  useEffect(() => {
    if (lock && lock !== me) useSceneStore.getState().setEditing(null);
  }, [lock, me]);

  // element bị người khác xoá khi đang sửa
  useEffect(() => {
    if (!el) useSceneStore.getState().setEditing(null);
  }, [el]);

  if (!el) return null;

  const finish = () => {
    send(ref.current?.value ?? text);
    useSceneStore.getState().setEditing(null);
  };

  const topLeft = worldToScreen({ x: el.x, y: el.y }, viewport);
  const isSticky = el.type === "sticky";
  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        typed.current = e.target.value;
        useSceneStore.getState().patchLocal([{ id, set: { text: e.target.value } }]);
        if (timer.current) clearTimeout(timer.current);
        const value = e.target.value;
        timer.current = setTimeout(() => send(value), TEXT_DEBOUNCE_MS);
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") finish();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`absolute resize-none outline-none border-2 border-blue-500 p-2 ${isSticky ? "" : "text-center bg-transparent"}`}
      style={{
        left: topLeft.x,
        top: topLeft.y,
        width: el.w * viewport.s,
        height: el.h * viewport.s,
        fontSize: (el.style?.fontSize ?? 16) * viewport.s,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "center center",
        background: isSticky ? fillToHex(el.style?.fill) : "rgba(255,255,255,0.6)",
        color: isSticky ? "#000" : el.style?.stroke ?? "#111827",
        zIndex: 30,
      }}
    />
  );
};

export default TextEditOverlay;
