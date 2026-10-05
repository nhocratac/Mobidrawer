import type { CreateImageNoteDto } from "@/lib/Zustand/ImageNoteStore";
import type { CreateStickNoteDto } from "@/lib/Zustand/type.type";
import { BoardElement, newObjectId } from "./types";

const DEFAULT_SIZE = 200;

const toNumber = (v: number | string): number => {
  const n = typeof v === "string" ? parseInt(v.replace("px", ""), 10) : v;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SIZE;
};

// Dữ liệu định dạng cũ (AI, template mẫu, file .mobi 1.0) → element
export function stickyDtoToElement(d: CreateStickNoteDto, boardId: string, z: number): BoardElement {
  return {
    id: newObjectId(),
    boardId,
    type: "sticky",
    x: d.position?.x ?? 0,
    y: d.position?.y ?? 0,
    w: toNumber(d.size?.width ?? DEFAULT_SIZE),
    h: toNumber(d.size?.height ?? DEFAULT_SIZE),
    rotation: 0,
    z,
    version: 0,
    text: d.text,
    style: { fill: d.color },
  };
}

export function imageDtoToElement(d: CreateImageNoteDto, boardId: string, z: number): BoardElement {
  return {
    id: newObjectId(),
    boardId,
    type: "image",
    x: d.position?.x ?? 0,
    y: d.position?.y ?? 0,
    w: toNumber(d.size?.width ?? DEFAULT_SIZE),
    h: toNumber(d.size?.height ?? DEFAULT_SIZE),
    rotation: 0,
    z,
    version: 0,
    image: { url: d.url, alt: d.alt, cloudinaryId: d.cloudinaryId },
  };
}

// Cấp id mới (khi import) và nối lại connector; connector thiếu đầu bị bỏ
export function remapIds(els: BoardElement[], boardId: string): BoardElement[] {
  const map = new Map<string, string>();
  const out: BoardElement[] = [];
  els.filter((e) => e.type !== "connector").forEach((e) => {
    const id = newObjectId();
    map.set(e.id, id);
    out.push({ ...e, id, boardId, version: 0 });
  });
  els.filter((e) => e.type === "connector" && e.connector).forEach((e) => {
    const from = map.get(e.connector!.from.elementId);
    const to = map.get(e.connector!.to.elementId);
    if (!from || !to) return;
    out.push({
      ...e,
      id: newObjectId(),
      boardId,
      version: 0,
      connector: { from: { ...e.connector!.from, elementId: from }, to: { ...e.connector!.to, elementId: to } },
    });
  });
  return out;
}

// Element không kèm thông tin riêng của board (dùng cho .mobi và template)
export function portableElement(e: BoardElement) {
  return {
    id: e.id,
    type: e.type,
    x: e.x,
    y: e.y,
    w: e.w,
    h: e.h,
    rotation: e.rotation,
    z: e.z,
    text: e.text,
    style: e.style,
    image: e.image,
    shape: e.shape,
    connector: e.connector,
  };
}
