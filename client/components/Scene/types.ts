export type ElementType = "sticky" | "image" | "shape" | "connector";
export type ShapeKind = "rect" | "ellipse" | "triangle" | "line" | "arrow";
export type Anchor = "auto" | "top" | "right" | "bottom" | "left";
export type Side = Exclude<Anchor, "auto">;

export interface ConnectorEnd {
  elementId: string;
  anchor: Anchor;
}

export interface ElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
}

export interface BoardElement {
  id: string;
  boardId: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
  owner?: string;
  version: number;
  updateAt?: string;
  text?: string;
  style?: ElementStyle;
  image?: { url: string; cloudinaryId?: string; alt?: string };
  shape?: { kind: ShapeKind };
  connector?: { from: ConnectorEnd; to: ConnectorEnd };
}

export type ElementPatchSet = Partial<
  Pick<BoardElement, "x" | "y" | "w" | "h" | "rotation" | "z" | "text" | "style" | "shape" | "connector">
>;

export interface ElementPatch {
  id: string;
  set: ElementPatchSet;
  version?: number;
}

export interface ElementEvent {
  op: "create" | "patch" | "preview" | "delete" | "lock" | "unlock";
  senderSessionId: string;
  userId: string;
  elements?: BoardElement[];
  patches?: ElementPatch[];
  ids?: string[];
}

let counter = Math.floor(Math.random() * 0xffffff);

// Mongo ObjectId dạng 24 hex sinh ở client để không phải đối chiếu id tạm
export function newObjectId(): string {
  const seconds = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  let random = "";
  for (let i = 0; i < 10; i++) random += Math.floor(Math.random() * 16).toString(16);
  counter = (counter + 1) % 0xffffff;
  return seconds + random + counter.toString(16).padStart(6, "0");
}
