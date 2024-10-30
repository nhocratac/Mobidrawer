import { useToolDevStore } from '@/lib/Zustand/store';
import React, { useEffect, useLayoutEffect, useRef } from 'react';

interface PencilCanvasProps {
  color: string;
  thickness: number;
  scale: number;
  opacity : number;
  translate: { x: number, y: number };
  path: { x: number, y: number }[];
  setPath: (newPath: { x: number, y: number }[]) => void; // Thêm hàm cập nhật path
}

const PencilCanvas = ({ color, thickness, path, scale, translate, opacity, setPath }: PencilCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeTool = useToolDevStore(state => state.mode)

  const erasePartOfPath = (eraseX: number, eraseY: number) => {
    console.log(eraseX,eraseY)
    const threshold = 10; // Khoảng cách để xác định vùng xóa
    const newPath = path.filter(point => {
      const distance = Math.sqrt((point.x - eraseX) ** 2 + (point.y - eraseY) ** 2);
      return distance > threshold; // Giữ lại các điểm không nằm trong vùng xóa
    });
    setPath(newPath); // Cập nhật path
  };



  useEffect(() => {
    const canvasPen = canvasRef.current;
    if (!canvasPen) return;

    const ctx = canvasPen.getContext("2d");
    if (!ctx) return;

    // Calculate the bounding box of the path

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
    const handleMouseDown = (event: MouseEvent) => {
      console.log('on mouse down')
      const rect = canvasPen.getBoundingClientRect();
      const x = (event.clientX - rect.left - translate.x) / scale;
      const y = (event.clientY - rect.top - translate.y) / scale;
      erasePartOfPath(x, y);
    };
    canvasPen.addEventListener('click', () => console.log('okoko'));
    canvasPen.addEventListener('mousedown', handleMouseDown);
    return () => {
      canvasPen.removeEventListener('click', () => console.log('okoko'));
      canvasPen.removeEventListener('mousedown', handleMouseDown);
    };
  }, [modeTool, scale, translate, path]);

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
