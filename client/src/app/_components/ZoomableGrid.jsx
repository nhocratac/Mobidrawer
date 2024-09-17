import { useEffect, useRef, useState } from 'react';

const ZoomableGrid = ({ children, onSetScale }) => {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas to always match full-screen size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawGrid();
    };

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply scale and translation
      ctx.scale(scale, scale);
      ctx.translate(translate.x / scale, translate.y / scale);

      // Draw the grid lines
      const gridSize = 50; // Adjust the grid size
      for (let x = -canvas.width; x < canvas.width * 2 / scale; x += gridSize) {
        for (let y = -canvas.height; y < canvas.height * 2 / scale; y += gridSize) {
          ctx.strokeStyle = '#ddd';
          ctx.lineWidth = 0.1;
          ctx.strokeRect(x, y, gridSize, gridSize);
        }
      }

      ctx.restore();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [scale, translate]);

  const handleZoom = (e) => {
    const newScale = e.deltaY > 0 ? scale * 0.9 : scale * 1.1;
    setScale( Math.min(Math.max(0.5, newScale), 5)); // Limit zoom level between 0.5 and 5
   onSetScale(Math.min(Math.max(0.5, newScale), 5));
  };

  const handleMouseDown = (e) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });

  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setTranslate({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Calculate the position and scaling for the children
  const getTransformedStyle = () => ({
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    transformOrigin: '0 0',
    
  });

  return (
    <div className="relative bg-slate-700 ">

   
      {/* Canvas for drawing the grid */}
      <canvas
        ref={canvasRef}
        onWheel={handleZoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          cursor: isPanning ? 'grabbing' : 'default',
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents:'auto',
        }}
      />


        <div className='absolute top-0 bg-red-600' 
        //style={getTransformedStyle()}
        >
          {children}
        </div>

      
    </div>
    
  );
};

export default ZoomableGrid;
