import type { BoardElement } from "../types";

const ImageView = ({ el }: { el: BoardElement }) => (
  <>
    <rect width={el.w} height={el.h} fill="transparent" stroke="#9ca3af" strokeWidth={1} />
    {el.image?.url ? (
      <image href={el.image.url} width={el.w} height={el.h} preserveAspectRatio="xMidYMid meet" />
    ) : (
      <text x={8} y={20} fill="#ef4444" fontSize={14}>Image URL is missing</text>
    )}
  </>
);

export default ImageView;
