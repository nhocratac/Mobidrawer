import React, { useEffect, useRef } from 'react';

interface PencilCanvasProps {
  color: string;
  thickness: number;
  scale: number;
  translate: { x: number, y: number };
  path: { x: number, y: number }[];
}

// const calSizeCanvas = (path: { x: number, y: number }[]) => {
//   if (path.length === 0) {
//     return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
//   }
//   let minX = path[0].x;
//   let minY = path[0].y;
//   let maxX = path[0].x;
//   let maxY = path[0].y;
//   path.forEach(point => {
//     if (point.x < minX) minX = point.x;
//     if (point.y < minY) minY = point.y;
//     if (point.x > maxX) maxX = point.x;
//     if (point.y > maxY) maxY = point.y;
//   });
//   return { minX, minY, maxX, maxY };
// };

const PencilCanvas = ({ color, thickness, path, scale, translate }: PencilCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasPen = canvasRef.current;
    if (!canvasPen) return;

    const ctx = canvasPen.getContext("2d");
    if (!ctx) return;

    // Calculate the bounding box of the path
  
    // Set canvas size to full window
    canvasPen.width =window.innerWidth;
    canvasPen.height = window.innerHeight;

    // Clear canvas before redrawing
    ctx.clearRect(0, 0, canvasPen.width, canvasPen.height);
    ctx.save();

    // Apply scale and translation
    ctx.scale(scale, scale);
    ctx.translate(translate.x / scale, translate.y / scale);

    // Set drawing properties
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw the path
    if (path.length > 0) {
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    ctx.restore(); // Restore the previous context state
  }, [color, thickness, path, scale, translate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Make sure canvas doesn't capture events
      }}
    />
  );
};

export default PencilCanvas;
