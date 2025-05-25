export enum ModeType {
  drag = "drag",
  idle = "idle",
  resize = "resize",
  rotate = "rotate",
  pen = "pen",
  eraser = "eraser",
}

export enum ModeRole {
  editor = "editor",
  viewer = "viewer"
}

export interface ToolDevState {
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  pencil: {
    color: string;
    thickness?: number;
    opacity?: number;
    setColor?: (color: string) => void;
    setThickness?: (thickness: number) => void;
    setOpacity?: (opacity: number) => void;
  };
}

export interface coordinate {
  x: number;
  y: number;
}

export interface canvasPath {
  id: string; // ID từ MongoDB
  thickness: number;
  color: string;
  opacity: number;
  paths: coordinate[];
  isSelected?: boolean; // Đánh dấu đường vẽ được chọn
}

export interface member {
  memberId: string,
  role: ModeRole,
}

export interface ItemProps {
  id : string ;
  ImageThumnail: string;
  previewImageUrl : string;
  title : string;
  description: string;
  name: string;
  owner : string;
  canvasPaths: canvasPath[];
  stickyNotes: StickyNote[];
}  



export interface Member {
  memberId : string,
  role : ROLE
}

 export type ROLE = "VIEWER" | "EDITOR"

export interface Board {
  id: string,
  name : string,
  owner :string ,
  type: string,
  description : string,
  option : {
    grid : boolean;
    backgroundColor : string;
  },
  thumbnail: string,
  updateAt: string,
  members: Member[],
  canvasPaths : canvasPath[],
  stickyNotes : StickyNote[]
}

export interface BoardStore {
  board: Board | null;
  setBoard: (board: Board) => void;
  setBoardColor: ( color: string) => void;
  setGridVisible: () => void;
  setMembers : (members: Member[]) => void;
  updateBoard: (updates: Partial<Board>) => void;
  clearBoard: () => void;
}

export interface CreateCanvasPath extends canvasPath {
  
}

export interface StickyNote {
  id: string;
  color: string;
  text : string;
  size :{
    width: number;
    height: number;
  }
  position : {
    x: number;
    y: number;
  },
  owner : string;
  boardId : string;
  updateAt?: string;
  isSelected ?: string | null;
}

export interface CreateStickNoteDto {
  color: string;
  text : string;
  size :{
    width: number;
    height: number;
  }
  position : {
    x: number;
    y: number;
  },
}