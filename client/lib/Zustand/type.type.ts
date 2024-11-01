import { Avatar } from '@/components/ui/avatar';
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
}

export interface ListBoardState {
  boards: BoardState[];
  setBoards: (newBoard: BoardState) => void;
}
