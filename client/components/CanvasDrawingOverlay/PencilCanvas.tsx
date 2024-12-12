import { useToolDevStore } from '@/lib/Zustand/store';
import { useEffect, useRef } from 'react';

interface PencilCanvasProps {
  color: string;
  thickness: number;
  scale: number;
  opacity : number;
  translate: { x: number, y: number };
  path: { x: number, y: number }[];
  setPath: (newPath: { x: number, y: number }[]) => void; // Thêm hàm cập nhật path
}

const PencilCanvas = ({ color, thickness, path, scale, translate, opacity }: PencilCanvasProps) => {
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

  useEffect(() => {
    const canvasPen = canvasRef.current;
    if (!canvasPen || modeTool !== 'eraser') return;
    const handleMouseDown = () => {

    };
    canvasPen.addEventListener('mousedown', handleMouseDown);
    return () => {
      canvasPen.removeEventListener('mousedown', handleMouseDown);
    };
  }, [modeTool, scale, translate, path,opacity]);

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
