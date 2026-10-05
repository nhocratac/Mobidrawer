import { setDragging, useSceneStore } from "@/lib/Zustand/sceneStore";
import { useToolDevStore } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { SHAPE_TOOLS, ToolType } from "@/lib/Zustand/type.type";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  AABB,
  Handle,
  nearestAnchor,
  normBox,
  Pt,
  resizeBox,
  rotationFromPointer,
  screenToWorld,
  zoomAt,
} from "./geometry";
import { elementsInRect, hitElement, isLine } from "./hitTest";
import { sceneSocket } from "./sceneSocket";
import { shapeFromDrag } from "./shapeFactory";
import type { PencilTool } from "./usePencilTool";
import { Anchor, BoardElement, ConnectorEnd, ElementPatch, newObjectId, ShapeKind, Side } from "./types";

type Mode =
  | "idle"
  | "panning"
  | "pen"
  | "dragging"
  | "resizing"
  | "rotating"
  | "lineEnd"
  | "marquee"
  | "creating"
  | "connecting"
  | "connEnd";

interface Gesture {
  mode: Mode;
  startScreen: Pt;
  startWorld: Pt;
  lastWorld: Pt;
  startViewport: { s: number; tx: number; ty: number };
  startEls: Record<string, BoardElement>;
  ids: string[];
  handle?: Handle;
  lineEnd?: "start" | "end";
  moved: boolean;
  movePaths: boolean;
  from?: ConnectorEnd;
  connectorId?: string;
  connEnd?: "from" | "to";
  additive: boolean;
}

export interface ConnectDraft {
  from: ConnectorEnd | null; // null khi đang kéo đầu "from" của connector có sẵn
  fixed?: ConnectorEnd; // đầu còn lại khi kéo đầu connector có sẵn
  to: Pt;
  targetId: string | null;
}

const DRAG_THRESHOLD_PX = 3;
const ANCHOR_SNAP_PX = 12;
const ZOOM_STEP = 1.1;
export const STICKY_SIZE = 200;

const idle = (): Gesture => ({
  mode: "idle",
  startScreen: { x: 0, y: 0 },
  startWorld: { x: 0, y: 0 },
  lastWorld: { x: 0, y: 0 },
  startViewport: { s: 1, tx: 0, ty: 0 },
  startEls: {},
  ids: [],
  moved: false,
  movePaths: false,
  additive: false,
});

const lockedByOther = (id: string) => {
  const lock = useSceneStore.getState().locks[id];
  return !!lock && lock !== useTokenStore.getState().user?.id;
};

const pick = (els: Record<string, BoardElement>, ids: string[]) => {
  const out: Record<string, BoardElement> = {};
  ids.forEach((id) => els[id] && (out[id] = els[id]));
  return out;
};

export function usePointerController(opts: {
  boardId: string;
  svgRef: RefObject<SVGSVGElement>;
  canEdit: boolean;
  pencil: PencilTool;
  cursorRef: { current: Pt | null };
}) {
  const { boardId, svgRef, canEdit, pencil, cursorRef } = opts;
  const g = useRef<Gesture>(idle());
  const spaceHeld = useRef(false);
  const [marquee, setMarquee] = useState<AABB | null>(null);
  const [draft, setDraftState] = useState<BoardElement | null>(null);
  const draftRef = useRef<BoardElement | null>(null);
  const setDraft = (d: BoardElement | null) => {
    draftRef.current = d;
    setDraftState(d);
  };
  const [connectDraft, setConnectDraft] = useState<ConnectDraft | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);

  const local = useCallback(
    (e: { clientX: number; clientY: number }): Pt => {
      const rect = svgRef.current?.getBoundingClientRect();
      return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
    },
    [svgRef]
  );

  // Nét pencil cũ được lưu với bias -thickness/2 (ZoomableGrid cũ); giữ nguyên để nét mới khớp nét cũ
  const penWorld = (p: Pt): Pt => {
    const { s, tx, ty } = useSceneStore.getState().viewport;
    const half = (useToolDevStore.getState().pencil.thickness || 1) / 2;
    return { x: (p.x - tx - half) / s, y: (p.y - ty - half) / s };
  };

  const setTool = (tool: ToolType) => useToolDevStore.getState().setTool(tool);

  const targetUnder = (w: Pt, exclude: string[]) => {
    const st = useSceneStore.getState();
    return hitElement(w, st.elements, st.order, st.viewport.s, { skipConnectors: true, exclude });
  };

  const anchorFor = (id: string, w: Pt): Anchor => {
    const st = useSceneStore.getState();
    const el = st.elements[id];
    return (el && nearestAnchor({ ...normBox(el), kind: el.shape?.kind }, w, ANCHOR_SNAP_PX / st.viewport.s)) || "auto";
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) return;
      const st = useSceneStore.getState();
      const { tool, shapeStyle, stickyColor } = useToolDevStore.getState();
      const p = local(e);
      const w = screenToWorld(p, st.viewport);
      const target = e.target as Element;
      const gesture = idle();
      gesture.startScreen = p;
      gesture.startWorld = w;
      gesture.lastWorld = w;
      gesture.startViewport = st.viewport;
      gesture.additive = e.shiftKey;
      g.current = gesture;
      svgRef.current?.setPointerCapture(e.pointerId);

      if (e.button === 1 || tool === "hand" || spaceHeld.current) {
        gesture.mode = "panning";
        setPanning(true);
        return;
      }
      if (e.button !== 0) return;

      if (tool === "pen") {
        if (!canEdit) return;
        pencil.start(penWorld(p));
        gesture.mode = "pen";
        return;
      }

      const handle = target.closest("[data-handle]")?.getAttribute("data-handle");
      if (handle && canEdit && st.selection.length === 1) {
        const id = st.selection[0];
        if (!st.elements[id] || lockedByOther(id)) return;
        gesture.ids = [id];
        gesture.startEls = pick(st.elements, [id]);
        if (handle === "rotate") gesture.mode = "rotating";
        else if (handle === "start" || handle === "end") {
          gesture.mode = "lineEnd";
          gesture.lineEnd = handle;
        } else {
          gesture.mode = "resizing";
          gesture.handle = handle as Handle;
        }
        setDragging([id]);
        return;
      }

      const connEnd = target.closest("[data-conn-end]")?.getAttribute("data-conn-end") as "from" | "to" | null;
      if (connEnd && canEdit && st.selection.length === 1) {
        const conn = st.elements[st.selection[0]];
        if (!conn?.connector) return;
        gesture.mode = "connEnd";
        gesture.connectorId = conn.id;
        gesture.connEnd = connEnd;
        const fixed = connEnd === "from" ? conn.connector.to : conn.connector.from;
        setConnectDraft({ from: connEnd === "to" ? conn.connector.from : null, fixed, to: w, targetId: null });
        return;
      }

      const anchorEl = target.closest("[data-anchor]");
      if (anchorEl && canEdit) {
        const owner = anchorEl.getAttribute("data-anchor-owner")!;
        gesture.mode = "connecting";
        gesture.from = { elementId: owner, anchor: anchorEl.getAttribute("data-anchor") as Side };
        setConnectDraft({ from: gesture.from, to: w, targetId: null });
        return;
      }

      if (SHAPE_TOOLS.includes(tool)) {
        if (!canEdit) return;
        gesture.mode = "creating";
        setDraft(shapeFromDrag(tool as ShapeKind, w, w, false, shapeStyle, boardId, st.topZ() + 1));
        return;
      }

      if (tool === "sticky") {
        if (!canEdit) return;
        const sticky: BoardElement = {
          id: newObjectId(),
          boardId,
          type: "sticky",
          x: w.x - STICKY_SIZE / 2,
          y: w.y - STICKY_SIZE / 2,
          w: STICKY_SIZE,
          h: STICKY_SIZE,
          rotation: 0,
          z: st.topZ() + 1,
          version: 0,
          text: "Type here...",
          style: { fill: stickyColor },
        };
        sceneSocket.create(boardId, [sticky]);
        st.setSelection([sticky.id]);
        setTool("select");
        return;
      }

      const hitId = hitElement(w, st.elements, st.order, st.viewport.s);

      if (tool === "connector") {
        if (!canEdit || !hitId || st.elements[hitId].type === "connector") return;
        gesture.mode = "connecting";
        gesture.from = { elementId: hitId, anchor: "auto" };
        setConnectDraft({ from: gesture.from, to: w, targetId: null });
        return;
      }

      if (hitId) {
        let selection = st.selection;
        if (e.shiftKey) {
          selection = selection.includes(hitId) ? selection.filter((id) => id !== hitId) : [...selection, hitId];
          st.setSelection(selection);
          if (!selection.includes(hitId)) return;
        } else if (!selection.includes(hitId)) {
          selection = [hitId];
          st.setSelection(selection);
          pencil.clearSelection();
        }
        if (!canEdit) return;
        const movable = selection.filter((id) => st.elements[id] && st.elements[id].type !== "connector" && !lockedByOther(id));
        gesture.mode = "dragging";
        gesture.ids = movable;
        gesture.startEls = pick(st.elements, movable);
        gesture.movePaths = pencil.hasSelection();
        setDragging(movable);
        return;
      }

      const box = pencil.selectionBox;
      if (box && canEdit && w.x >= box.minX && w.x <= box.maxX && w.y >= box.minY && w.y <= box.maxY) {
        gesture.mode = "dragging";
        gesture.movePaths = true;
        gesture.ids = st.selection.filter((id) => st.elements[id]?.type !== "connector" && !lockedByOther(id));
        gesture.startEls = pick(st.elements, gesture.ids);
        setDragging(gesture.ids);
        return;
      }

      if (!e.shiftKey) {
        st.setSelection([]);
        pencil.clearSelection();
      }
      gesture.mode = "marquee";
      setMarquee({ minX: w.x, minY: w.y, maxX: w.x, maxY: w.y });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardId, canEdit, pencil, local]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = useSceneStore.getState();
      const p = local(e);
      const w = screenToWorld(p, st.viewport);
      cursorRef.current = w;
      const gesture = g.current;
      if (
        !gesture.moved &&
        Math.hypot(p.x - gesture.startScreen.x, p.y - gesture.startScreen.y) >= DRAG_THRESHOLD_PX
      )
        gesture.moved = true;

      switch (gesture.mode) {
        case "idle": {
          const tool = useToolDevStore.getState().tool;
          if (tool !== "select" && tool !== "connector") {
            if (hoverId) setHoverId(null);
            return;
          }
          const id = hitElement(w, st.elements, st.order, st.viewport.s, { skipConnectors: true });
          if (id !== hoverId) setHoverId(id);
          return;
        }
        case "panning":
          st.setViewport({
            s: gesture.startViewport.s,
            tx: gesture.startViewport.tx + (p.x - gesture.startScreen.x),
            ty: gesture.startViewport.ty + (p.y - gesture.startScreen.y),
          });
          return;
        case "pen":
          pencil.extend(penWorld(p));
          return;
        case "dragging": {
          if (!gesture.moved) return;
          const dx = w.x - gesture.startWorld.x;
          const dy = w.y - gesture.startWorld.y;
          sceneSocket.preview(
            boardId,
            gesture.ids.map((id) => ({ id, set: { x: gesture.startEls[id].x + dx, y: gesture.startEls[id].y + dy } }))
          );
          if (gesture.movePaths) pencil.moveSelectedBy(w.x - gesture.lastWorld.x, w.y - gesture.lastWorld.y);
          gesture.lastWorld = w;
          return;
        }
        case "resizing": {
          const start = gesture.startEls[gesture.ids[0]];
          const r = resizeBox(start, gesture.handle!, w, e.shiftKey);
          sceneSocket.preview(boardId, [{ id: start.id, set: { x: r.x, y: r.y, w: r.w, h: r.h } }]);
          return;
        }
        case "rotating": {
          const start = gesture.startEls[gesture.ids[0]];
          sceneSocket.preview(boardId, [{ id: start.id, set: { rotation: rotationFromPointer(start, w, e.shiftKey) } }]);
          return;
        }
        case "lineEnd": {
          const start = gesture.startEls[gesture.ids[0]];
          const set =
            gesture.lineEnd === "start"
              ? { x: w.x, y: w.y, w: start.x + start.w - w.x, h: start.y + start.h - w.y }
              : { w: w.x - start.x, h: w.y - start.y };
          sceneSocket.preview(boardId, [{ id: start.id, set }]);
          return;
        }
        case "marquee":
          setMarquee({
            minX: Math.min(gesture.startWorld.x, w.x),
            minY: Math.min(gesture.startWorld.y, w.y),
            maxX: Math.max(gesture.startWorld.x, w.x),
            maxY: Math.max(gesture.startWorld.y, w.y),
          });
          return;
        case "creating": {
          const d = draftRef.current;
          if (d) setDraft({ ...shapeFromDrag(d.shape!.kind, gesture.startWorld, w, e.shiftKey, d.style ?? {}, boardId, d.z), id: d.id });
          return;
        }
        case "connecting":
        case "connEnd": {
          const exclude = gesture.from ? [gesture.from.elementId] : [];
          setConnectDraft((d) => (d ? { ...d, to: w, targetId: targetUnder(w, [...exclude, ...(d.fixed ? [d.fixed.elementId] : [])]) } : d));
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardId, pencil, local, hoverId]
  );

  const commitGeometry = (ids: string[], keys: (keyof BoardElement)[]) => {
    const els = useSceneStore.getState().elements;
    const patches: ElementPatch[] = ids
      .filter((id) => els[id])
      .map((id) => {
        const set: Record<string, unknown> = {};
        keys.forEach((k) => (set[k] = els[id][k]));
        return { id, set };
      });
    sceneSocket.patch(boardId, patches);
  };

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const st = useSceneStore.getState();
      const gesture = g.current;
      const w = screenToWorld(local(e), st.viewport);
      if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);

      switch (gesture.mode) {
        case "panning":
          setPanning(false);
          break;
        case "pen":
          pencil.end();
          break;
        case "dragging":
          if (gesture.moved) {
            commitGeometry(gesture.ids, ["x", "y"]);
            if (gesture.movePaths) pencil.commitMove();
          }
          break;
        case "resizing":
        case "lineEnd":
          if (gesture.moved) commitGeometry(gesture.ids, ["x", "y", "w", "h"]);
          break;
        case "rotating":
          if (gesture.moved) commitGeometry(gesture.ids, ["rotation"]);
          break;
        case "marquee": {
          const rect = {
            minX: Math.min(gesture.startWorld.x, w.x),
            minY: Math.min(gesture.startWorld.y, w.y),
            maxX: Math.max(gesture.startWorld.x, w.x),
            maxY: Math.max(gesture.startWorld.y, w.y),
          };
          if (gesture.moved) {
            const ids = elementsInRect(rect, st.elements);
            st.setSelection(gesture.additive ? Array.from(new Set([...st.selection, ...ids])) : ids);
            pencil.selectInRect(rect);
          }
          setMarquee(null);
          break;
        }
        case "creating": {
          const d = draftRef.current;
          if (d) {
            sceneSocket.create(boardId, [d]);
            st.setSelection([d.id]);
          }
          setDraft(null);
          setTool("select");
          break;
        }
        case "connecting": {
          const from = gesture.from!;
          const targetId = targetUnder(w, [from.elementId]);
          if (targetId) {
            const conn: BoardElement = {
              id: newObjectId(),
              boardId,
              type: "connector",
              x: 0,
              y: 0,
              w: 0,
              h: 0,
              rotation: 0,
              z: st.topZ() + 1,
              version: 0,
              style: { stroke: "#111827", strokeWidth: 2 },
              connector: { from, to: { elementId: targetId, anchor: anchorFor(targetId, w) } },
            };
            sceneSocket.create(boardId, [conn]);
            st.setSelection([conn.id]);
          }
          setConnectDraft(null);
          break;
        }
        case "connEnd": {
          const conn = st.elements[gesture.connectorId!];
          if (conn?.connector) {
            const other = gesture.connEnd === "from" ? conn.connector.to : conn.connector.from;
            const targetId = targetUnder(w, [other.elementId]);
            if (targetId) {
              const end = { elementId: targetId, anchor: anchorFor(targetId, w) };
              const connector = gesture.connEnd === "from" ? { from: end, to: other } : { from: other, to: end };
              sceneSocket.patch(boardId, [{ id: conn.id, set: { connector } }]);
            }
          }
          setConnectDraft(null);
          break;
        }
      }
      setDragging([]);
      g.current = idle();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardId, pencil, local]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canEdit) return;
      const st = useSceneStore.getState();
      const w = screenToWorld(local(e), st.viewport);
      const id = hitElement(w, st.elements, st.order, st.viewport.s, { skipConnectors: true });
      if (!id || lockedByOther(id)) return;
      const el = st.elements[id];
      if (el.type === "sticky" || (el.type === "shape" && !isLine(el))) {
        st.setSelection([id]);
        st.setEditing(id);
      }
    },
    [canEdit, local]
  );

  // wheel cần listener non-passive để chặn zoom của trình duyệt khi ctrl+wheel (pinch trackpad)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = useSceneStore.getState();
      st.setViewport(zoomAt(st.viewport, local(e), e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svgRef, local]);

  const cancelGesture = useCallback(() => {
    setMarquee(null);
    setDraft(null);
    setConnectDraft(null);
    setDragging([]);
    g.current = idle();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onDoubleClick,
    cancelGesture,
    marquee,
    draft,
    connectDraft,
    hoverId,
    panning,
    spaceHeld,
  };
}
