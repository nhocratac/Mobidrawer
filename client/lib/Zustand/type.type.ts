
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

export enum boardType {
    flowchart = 'flowchart',
    brainWritting='brainwritting',
    intelligentTemplate = 'intelligentTemplate',
    kanbanFramework = 'kanbanFramework',
    mindMap = 'mindMap',
    quickRetrospective ='quickRetrospectives',
}

export interface BoardState {
  id: number;
  name ?: string ;
  owner ?: string ,
  type : boardType;
  description ?: string ,
  options: {
    grid ?: boolean;
    backgroundColor ?: string;
  };
  thumbnail : string;
  updateAt ?: string,
  members: member[],
  canvasPaths: canvasPath[];
}

export interface ListBoardState {
  boards: BoardState[];
  addnewBoard: (newBoard: BoardState) => void;
  updateBoard: (newBoard: BoardState) => void;
  setBoardColor: (id: number, color: string) => void;
  setGridVisible: (id: number) => void;
  selectPath: (boardId: number, pathIndex: number) => void; //Chọn đối tượng
  deselectPath: (boardId: number) => void; // Bỏ chọn tất cả
}

export interface ItemProps {
  id : string ;
  ImageThumnail: string;
  owner: {
      name: string;
      logo: string;
  };
  name: string;
  info: {
      description: string;
      price: number;
      rating: number;
  }
}  

export interface TemplateStoreState {
  templates : ItemProps[];
  addTemplate : (template: ItemProps) => void;
  updateTemplate : (template: ItemProps) => void;
  deleteTemplate : (id: string) => void;
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
  canvasPaths : canvasPath[]
}

export interface BoardStore {
  board: Board | null;
  setBoard: (board: Board) => void;
  setBoardColor: ( color: string) => void;
  setGridVisible: () => void;
  updateBoard: (updates: Partial<Board>) => void;
  clearBoard: () => void;
}

export interface CreateCanvasPath extends canvasPath {
  
}