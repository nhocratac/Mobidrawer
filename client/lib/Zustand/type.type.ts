
export enum ModeType {
  drag = "drag",
  idle = "idle",
  resize = "resize",
  rotate = "rotate",
  pen = "pen",
  eraser = "eraser",
}

export interface ToolDevState {
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  pencil: {
    color?: string;
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
  path: coordinate[];
  isSelected?: boolean; // Đánh dấu đường vẽ được chọn
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
  backgroundColor?: "string";
  name ?: string ;
  description ?: string ,
  lastOpened ?: string ,
  owner ?: string ,
  type : boardType;
  thumbnail : string;
  canvasPaths: canvasPath[];
  options: {
    gird ?: boolean;
    backgroundColor ?: string;
  };
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
