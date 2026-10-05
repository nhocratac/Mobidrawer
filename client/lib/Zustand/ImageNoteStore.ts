export interface CreateImageNoteDto {
  url: string;
  alt: string;
  cloudinaryId: string;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
}

export interface ImageNote {
  id: string;
  url: string;
  alt : string;
  cloudinaryId: string;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  owner: string;
  updateAt?: string;
  isSelected?: string;
}
