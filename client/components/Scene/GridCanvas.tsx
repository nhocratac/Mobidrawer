import { drawGridOnCanvas } from "@/components/BoardGrid/zoomableGridUtils";
import { useEffect, useRef } from "react";
import type { Viewport } from "./geometry";

const GridCanvas = ({ viewport, visible }: { viewport: Viewport; visible: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const draw = () => {
      const canvas = ref.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) drawGridOnCanvas(ctx, viewport.s, { x: viewport.tx, y: viewport.ty }, visible);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [viewport, visible]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

export default GridCanvas;
