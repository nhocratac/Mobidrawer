// zoomableGridUtils.ts

export const initCanvases = (
    gridCanvas: HTMLCanvasElement,
    drawCanvas: HTMLCanvasElement,
    drawGridFn: (ctx: CanvasRenderingContext2D, scale: number, translate: { x: number; y: number }, gridVisible: boolean) => void,
    scale: number,
    translate: { x: number; y: number },
    gridVisible: boolean
  ): void => {
    gridCanvas.width = window.innerWidth;
    gridCanvas.height = window.innerHeight;
    drawCanvas.width = window.innerWidth;
    drawCanvas.height = window.innerHeight;
    const ctx = gridCanvas.getContext("2d");
    if (ctx) {
      drawGridFn(ctx, scale, translate, gridVisible);
    }
  };
  
  export const drawGridOnCanvas = (
    gridCtx: CanvasRenderingContext2D,
    scale: number,
    translate: { x: number; y: number },
    gridVisible: boolean
  ): void => {
    gridCtx.clearRect(0, 0, gridCtx.canvas.width, gridCtx.canvas.height);
    gridCtx.save();
    gridCtx.scale(scale, scale);
    gridCtx.translate(translate.x / scale, translate.y / scale);
  
    const gridSize = 50;
    gridCtx.strokeStyle = gridVisible ? "#ddd" : "transparent";
    gridCtx.lineWidth = 0.1;
  
    // Vẽ các đường thẳng dọc
    for (let x = -gridCtx.canvas.width; x < (gridCtx.canvas.width * 10) / scale; x += gridSize) {
      gridCtx.beginPath();
      gridCtx.moveTo(x, -gridCtx.canvas.height);
      gridCtx.lineTo(x, (gridCtx.canvas.height * 10) / scale);
      gridCtx.stroke();
    }
  
    // Vẽ các đường thẳng ngang
    for (let y = -gridCtx.canvas.height; y < (gridCtx.canvas.height * 10) / scale; y += gridSize) {
      gridCtx.beginPath();
      gridCtx.moveTo(-gridCtx.canvas.width, y);
      gridCtx.lineTo((gridCtx.canvas.width * 10) / scale, y);
      gridCtx.stroke();
    }
    gridCtx.restore();
  };
  
  export const resizeCanvasHandler = (
    gridCanvas: HTMLCanvasElement,
    drawCanvas: HTMLCanvasElement,
    drawGridFn: (ctx: CanvasRenderingContext2D, scale: number, translate: { x: number; y: number }, gridVisible: boolean) => void,
    scale: number,
    translate: { x: number; y: number }
  ): void => {
    gridCanvas.width = window.innerWidth;
    gridCanvas.height = window.innerHeight;
    drawCanvas.width = window.innerWidth;
    drawCanvas.height = window.innerHeight;
    const ctx = gridCanvas.getContext("2d");
    if (ctx) {
      drawGridFn(ctx, scale, translate, true);
    }
  };
  