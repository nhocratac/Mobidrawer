import { useState } from "react";

type ShapeComponent = React.FC<React.SVGProps<SVGSVGElement>>;

export function useBoard() {
  const [scale, setScale] = useState(1);
  const [textItemCount, setTextItemCount] = useState(0);
  const [stickyNoteItemCount, setStickyNoteItemCount] = useState(0);
  const [shapeList, setShapeList] = useState<ShapeComponent[]>([]);
  const [stickyNoteColors, setStickyNoteColors] = useState<string[]>([]);

  const onClickCreateStickyNote = (colorName: string) => {
    setStickyNoteItemCount((prev) => prev + 1);
    setStickyNoteColors((prevColors) => [...prevColors, colorName]);
  };

  const onClickAddShape = (shape: ShapeComponent) => {
    setShapeList((prevShapes) => [...prevShapes, shape]);
  };

  const setScaleHandle = (s: number) => {
    setScale(s);
  };

  return {
    scale,
    setScaleHandle,
    textItemCount,
    setTextItemCount,
    stickyNoteItemCount,
    setStickyNoteItemCount,
    stickyNoteColors,
    onClickCreateStickyNote,
    shapeList,
    onClickAddShape,
  };
}
