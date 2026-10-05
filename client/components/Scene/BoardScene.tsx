"use client";

import BoardGridContext from "@/components/BoardGrid/BoardGridContext";
import PencilCanvas from "@/components/CanvasDrawingOverlay/PencilCanvas";
import MultiCursor from "@/components/MultiCursor/MultiCursor";
import { selectDisplayedElements, selectDisplayedOrder, useSceneStore } from "@/lib/Zustand/sceneStore";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useBoardStoreof, useToolDevStore } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { useEffect, useRef, useState } from "react";
import ElementContextMenu, { MenuState } from "./ElementContextMenu";
import ArrowMarker from "./elements/ArrowMarker";
import GridCanvas from "./GridCanvas";
import { anchorPoint, center, normBox, Pt, screenToWorld } from "./geometry";
import { hitElement } from "./hitTest";
import { isRedoKey, isTypingTarget, isUndoKey, shouldHandleDeleteKey } from "./keyboard";
import SceneElement, { ElementBody } from "./SceneElement";
import SelectionOverlay, { AnchorDots } from "./SelectionOverlay";
import { sceneSocket } from "./sceneSocket";
import StylePanel from "./StylePanel";
import TextEditOverlay from "./TextEditOverlay";
import { useCanEdit } from "./useCanEdit";
import { usePencilTool } from "./usePencilTool";
import { ConnectDraft, usePointerController } from "./usePointerController";

const CURSOR_BROADCAST_MS = 100;

const CURSORS: Record<string, string> = {
  hand: "grab",
  pen: "crosshair",
  sticky: "copy",
  rect: "crosshair",
  ellipse: "crosshair",
  triangle: "crosshair",
  line: "crosshair",
  arrow: "crosshair",
  connector: "crosshair",
  select: "default",
};

const BoardScene = ({ boardId }: { boardId: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const cursorRef = useRef<Pt | null>(null);
  const board = useBoardStoreof((s) => s.board);
  const viewport = useSceneStore((s) => s.viewport);
  const order = useSceneStore(selectDisplayedOrder);
  const ghosts = useSceneStore((s) => s.ghosts);
  const selection = useSceneStore((s) => s.selection);
  const historyMode = useSceneStore((s) => s.historyMode);
  const tool = useToolDevStore((s) => s.tool);
  const canEdit = useCanEdit();
  const pencil = usePencilTool(boardId);
  const ctl = usePointerController({ boardId, svgRef, canEdit, pencil, cursorRef });
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [gridMenu, setGridMenu] = useState<Pt | null>(null);

  const { cancelGesture, spaceHeld } = ctl;
  const { clearSelection: clearPencilSelection, deleteSelected: deletePencilSelection } = pencil;

  // Phím tắt: Delete xoá selection, Escape huỷ, giữ Space để pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || useSceneStore.getState().editingId) return;
      // đang xem lịch sử: không undo/redo (spec §9.3)
      if ((isUndoKey(e) || isRedoKey(e)) && useSceneStore.getState().historyMode) return;
      if (e.key === " ") {
        spaceHeld.current = true;
        e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        cancelGesture();
        useSceneStore.getState().setSelection([]);
        clearPencilSelection();
        return;
      }
      // Cmd/Ctrl+Z hoàn tác, Shift+Cmd/Ctrl+Z hoặc Ctrl+Y làm lại (stack ở server, chỉ thao tác của mình)
      if (isUndoKey(e) || isRedoKey(e)) {
        e.preventDefault();
        if (!canEdit) return;
        if (isRedoKey(e)) sceneSocket.redo(boardId);
        else sceneSocket.undo(boardId);
        return;
      }
      if (shouldHandleDeleteKey(e) && canEdit) {
        e.preventDefault();
        const st = useSceneStore.getState();
        const me = useTokenStore.getState().user?.id;
        const ids = st.selection.filter((id) => !st.locks[id] || st.locks[id] === me);
        sceneSocket.remove(boardId, ids);
        deletePencilSelection();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeld.current = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [boardId, canEdit, cancelGesture, spaceHeld, clearPencilSelection, deletePencilSelection]);

  // Gửi vị trí con trỏ (world) cho người khác mỗi 100ms
  useEffect(() => {
    let last: Pt | null = null;
    const timer = setInterval(() => {
      const client = useStompStore.getState().client;
      const p = cursorRef.current;
      if (!p || !client?.connected || (last && last.x === p.x && last.y === p.y)) return;
      last = p;
      client.publish({ destination: `/app/board/cursor/${boardId}`, body: JSON.stringify({ x: p.x, y: p.y, lastUpdated: Date.now() }) });
    }, CURSOR_BROADCAST_MS);
    return () => clearInterval(timer);
  }, [boardId]);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const st = useSceneStore.getState();
    const rect = svgRef.current?.getBoundingClientRect();
    const w = screenToWorld({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }, st.viewport);
    const id = hitElement(w, selectDisplayedElements(st), selectDisplayedOrder(st), st.viewport.s);
    setGridMenu(null);
    setMenu(null);
    if (id) {
      st.setSelection([id]);
      setMenu({ x: e.clientX, y: e.clientY, id });
    } else setGridMenu({ x: e.clientX, y: e.clientY });
  };

  const showAnchorsFor = canEdit && (tool === "select" || tool === "connector") && !ctl.draft ? ctl.hoverId : null;
  const cursor = ctl.panning ? "grabbing" : CURSORS[tool] ?? "default";

  return (
    <div
      id="board-area"
      className={`relative overflow-hidden ${board?.option?.backgroundColor || "bg-slate-700"}`}
      style={{ width: "100vw", height: "100vh" }}
      onClick={() => {
        setMenu(null);
        setGridMenu(null);
      }}
    >
      <GridCanvas viewport={viewport} visible={board?.option?.grid ?? true} />
      {/* nét vẽ không có lịch sử: ẩn khi đang xem phiên bản cũ */}
      {!historyMode && (
        <div className="absolute inset-0 pointer-events-none">
          {pencil.canvasPaths.map((path, index) => (
            <PencilCanvas
              key={path.id ?? `local-${index}`}
              color={path.color}
              thickness={path.thickness}
              paths={path.paths}
              opacity={path.opacity}
              scale={viewport.s}
              translate={{ x: viewport.tx, y: viewport.ty }}
              isSelected={!!path.isSelected}
            />
          ))}
        </div>
      )}
      <svg
        ref={svgRef}
        className="absolute inset-0"
        width="100%"
        height="100%"
        style={{ touchAction: "none", cursor }}
        onPointerDown={(e) => {
          setMenu(null);
          setGridMenu(null);
          ctl.onPointerDown(e);
        }}
        onPointerMove={ctl.onPointerMove}
        onPointerUp={ctl.onPointerUp}
        onPointerCancel={ctl.onPointerUp}
        onDoubleClick={ctl.onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <ArrowMarker id="arrow-draft" color="#22c55e" />
        <g transform={`translate(${viewport.tx} ${viewport.ty}) scale(${viewport.s})`}>
          {order.map((id) => (
            <SceneElement key={id} id={id} scale={viewport.s} />
          ))}
          {!historyMode && ghosts.map((el) => (
            <g key={`ghost-${el.id}`} opacity={0.5} pointerEvents="none">
              <ElementBody el={el} editing={false} locked={false} scale={viewport.s} />
              <rect
                x={el.x}
                y={el.y}
                width={el.w}
                height={el.h}
                fill="none"
                stroke="#dc2626"
                strokeDasharray={`${6 / viewport.s} ${4 / viewport.s}`}
                strokeWidth={2 / viewport.s}
              />
            </g>
          ))}
          {ctl.draft && (
            <g opacity={0.8} pointerEvents="none">
              <ElementBody el={ctl.draft} editing={false} locked={false} scale={viewport.s} />
            </g>
          )}
          <SelectionOverlay scale={viewport.s} canEdit={canEdit} pencilBox={historyMode ? null : pencil.selectionBox} />
          {showAnchorsFor && selection.length <= 1 && <AnchorDots id={showAnchorsFor} scale={viewport.s} />}
          {ctl.connectDraft && <ConnectDraftView draft={ctl.connectDraft} scale={viewport.s} />}
          {ctl.marquee && (
            <rect
              x={ctl.marquee.minX}
              y={ctl.marquee.minY}
              width={ctl.marquee.maxX - ctl.marquee.minX}
              height={ctl.marquee.maxY - ctl.marquee.minY}
              fill="rgba(59,130,246,0.08)"
              stroke="#3b82f6"
              strokeWidth={1.5 / viewport.s}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
      <TextEditOverlay boardId={boardId} />
      {canEdit && <StylePanel boardId={boardId} />}
      {menu && <ElementContextMenu boardId={boardId} menu={menu} canEdit={canEdit} onClose={() => setMenu(null)} />}
      {gridMenu && <BoardGridContext menuPosition={gridMenu} isVisible />}
      <MultiCursor scale={viewport.s} translate={{ x: viewport.tx, y: viewport.ty }} boardId={boardId} />
    </div>
  );
};

// Đường nối tạm khi đang kéo tạo / đổi đầu connector
const ConnectDraftView = ({ draft, scale }: { draft: ConnectDraft; scale: number }) => {
  const elements = useSceneStore((s) => s.elements);
  const anchorOf = (end: { elementId: string; anchor: string } | undefined | null) => {
    const el = end && elements[end.elementId];
    if (!el) return null;
    return end!.anchor === "auto" ? center(normBox(el)) : anchorPoint({ ...el, kind: el.shape?.kind }, end!.anchor as "top");
  };
  const start = anchorOf(draft.from ?? draft.fixed);
  if (!start) return null;
  return (
    <g pointerEvents="none">
      {draft.targetId && <AnchorDots id={draft.targetId} scale={scale} highlight />}
      <line
        x1={start.x}
        y1={start.y}
        x2={draft.to.x}
        y2={draft.to.y}
        stroke="#22c55e"
        strokeWidth={2 / scale}
        strokeDasharray={`${6 / scale} ${4 / scale}`}
        markerEnd="url(#arrow-draft)"
      />
    </g>
  );
};

export default BoardScene;
