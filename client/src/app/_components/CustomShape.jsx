import React from 'react';

export const Circle = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" stroke="black" strokeWidth="3" fill="transparent" />
  </svg>
);

export const Rectangle = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100">
    <rect x="10" y="10" width="80" height="60" stroke="black" strokeWidth="3" fill="transparent" />
  </svg>
);

export const Triangle = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100">
    <polygon points="50,10 90,90 10,90" stroke="black" strokeWidth="3" fill="transparent" />
  </svg>
);

export const Star = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100">
    <polygon points="50,10 61,35 88,35 66,55 72,82 50,65 28,82 34,55 12,35 39,35" stroke="black" strokeWidth="3" fill="transparent" />
  </svg>
);

export const LeftArrow = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100">
    <polygon points="70,20 70,40 30,40 30,60 70,60 70,80 90,50" stroke="black" strokeWidth="3" fill="transparent" />
  </svg>
);

export const RightArrow = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100">
    <polygon points="30,20 30,40 70,40 70,60 30,60 30,80 10,50" stroke="black" strokeWidth="3" fill="transparent" />
  </svg>
);

const Shapes = {
  Rectangle,
  Triangle,
  Circle,
  Star,
  LeftArrow,
  RightArrow,
};

export default Shapes;

export function getShapeByIndex(index) {
  const shapeKeys = Object.keys(Shapes);
  if (index >= 0 && index < shapeKeys.length) {
    const ShapeComponent = Shapes[shapeKeys[index]];
    return ShapeComponent;
  }
  return null;
}
