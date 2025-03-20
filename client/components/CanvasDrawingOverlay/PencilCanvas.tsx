import { useToolDevStore } from '@/lib/Zustand/store';
import { useEffect, useRef } from 'react';

interface PencilCanvasProps {
  color: string;
  thickness: number;
  scale: number;
  opacity : number;
  translate: { x: number, y: number };
  paths: { x: number, y: number }[];
  setPath: (newPath: { x: number, y: number }[]) => void; // Thêm hàm cập nhật path
  isSelected?: boolean; // Đánh dấu đường vẽ được chọn
}

const PencilCanvas = ({ color, thickness, paths, scale, translate, opacity, isSelected }: PencilCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeTool = useToolDevStore(state => state.mode)


  useEffect(() => {
    const canvasPen = canvasRef.current;
    if (!canvasPen) return;

    const ctx = canvasPen.getContext("2d");
    if (!ctx) return;


    // Set canvas size to full window
    canvasPen.width = window.innerWidth;
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
    ctx.globalAlpha = opacity

    // Draw the path
    if (paths.length > 0) {
      ctx.beginPath();
      ctx.moveTo(paths[0].x, paths[0].y);
      paths.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

    // Draw the selected path
    if(isSelected){
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
    
      paths.forEach(({ x, y }) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      });

      const padding = 5;

      ctx.beginPath();
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 1;

      ctx.strokeRect(
        minX - padding,
        minY - padding,
        maxX - minX + padding * 2,
        maxY - minY + padding * 2
      );
    }

    ctx.restore(); // Restore the previous context state
  }, [color, thickness, paths, scale, translate, isSelected, opacity]);

  useEffect(() => {
    const canvasPen = canvasRef.current;
    if (!canvasPen || modeTool !== 'eraser') return;
    const handleMouseDown = () => {

    };
    canvasPen.addEventListener('mousedown', handleMouseDown);
    return () => {
      canvasPen.removeEventListener('mousedown', handleMouseDown);
    };
  }, [modeTool, scale, translate, paths,opacity]);

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
