import { useToolDevStore } from '@/lib/Zustand/store';
import { useEffect, useRef, useState } from 'react';

const ZoomableGrid = ({ children, onSetScale }) => {
  const gridCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  
  // Trạng thái quản lý scale và dịch chuyển
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [penColor,setPenColor] = useState('#ff0000');
  // Trạng thái quản lý chế độ và hành động hiện tại
 // const [mode, setMode] = useState('idle'); // Các chế độ: 'drag', 'paint', 'idle'
  const mode = useToolDevStore(state => state.mode);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Trạng thái lưu vị trí bắt đầu của thao tác
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Trạng thái lưu trữ các đường vẽ
  const [paths, setPaths] = useState([]); // Mỗi đường là một mảng các điểm {x, y}

  // Hàm tiện ích để chuyển đổi tọa độ
  const getTransformedCoordinates = (x, y) => {
    return {
      x: (x - translate.x) / scale,
      y: (y - translate.y) / scale,
    };
  };

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const gridCtx = gridCanvas.getContext('2d');
    const drawCanvas = drawCanvasRef.current;
    const drawCtx = drawCanvas.getContext('2d');

    // Hàm điều chỉnh kích thước canvas khi cửa sổ thay đổi
    const resizeCanvases = () => {
      gridCanvas.width = window.innerWidth;
      gridCanvas.height = window.innerHeight;
      drawCanvas.width = window.innerWidth;
      drawCanvas.height = window.innerHeight;
      drawGrid();
      redrawDrawings();
    };

    // Hàm vẽ lưới
    const drawGrid = () => {
      gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
      gridCtx.save();

      // Áp dụng scale và dịch chuyển
      gridCtx.scale(scale, scale);
      gridCtx.translate(translate.x / scale, translate.y / scale);

      // Vẽ các đường lưới
      const gridSize = 50; // Điều chỉnh kích thước lưới
      gridCtx.strokeStyle = '#ddd';
      gridCtx.lineWidth = 0.1;

      // Vẽ các đường thẳng dọc
      for (let x = -gridCanvas.width; x < gridCanvas.width * 2 / scale; x += gridSize) {
        gridCtx.beginPath();
        gridCtx.moveTo(x, -gridCanvas.height);
        gridCtx.lineTo(x, gridCanvas.height * 2 / scale);
        gridCtx.stroke();
      }

      // Vẽ các đường thẳng ngang
      for (let y = -gridCanvas.height; y < gridCanvas.height * 2 / scale; y += gridSize) {
        gridCtx.beginPath();
        gridCtx.moveTo(-gridCanvas.width, y);
        gridCtx.lineTo(gridCanvas.width * 2 / scale, y);
        gridCtx.stroke();
      }

      gridCtx.restore();
    };

    // Hàm vẽ lại các đường đã vẽ bởi người dùng
    const redrawDrawings = () => {
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      drawCtx.save();

      // Áp dụng scale và dịch chuyển
      drawCtx.scale(scale, scale);
      drawCtx.translate(translate.x / scale, translate.y / scale);

      drawCtx.strokeStyle = penColor; // Màu sắc của đường vẽ
      drawCtx.lineWidth = 2 / scale; // Điều chỉnh độ dày đường vẽ dựa trên scale

      paths.forEach(path => {
        if (path.length > 0) {
          drawCtx.beginPath();
          drawCtx.moveTo(path[0].x, path[0].y);
          for (let point of path.slice(1)) {
            drawCtx.lineTo(point.x, point.y);
          }
          drawCtx.stroke();
        }
      });

      drawCtx.restore();
    };

    // Khởi tạo kích thước canvas khi component mounts
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases); // Thêm chỉ một lần

    // Vẽ lại lưới và các đường vẽ khi scale hoặc translate thay đổi
    const drawAll = () => {
      drawGrid();
      redrawDrawings();
    };

    drawAll();

    return () => {
      window.removeEventListener('resize', resizeCanvases);
    };
  }, [scale, translate, paths]);

  // Hàm xử lý zoom khi cuộn chuột
  const handleZoom = (e) => {
    e.preventDefault(); // Ngăn chặn hành vi mặc định của trình duyệt
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    let newScale = scale * zoomFactor;
    newScale = Math.min(Math.max(0.5, newScale), 5); // Giới hạn scale từ 0.5 đến 5
    setScale(newScale);
    if (onSetScale) onSetScale(newScale);
  };

  // Hàm xử lý khi nhấn chuột
  const handleMouseDown = (e) => {
    if (mode === 'drag' && e.button === 0) { // Middle mouse button for panning
      e.preventDefault(); // Ngăn chặn hành vi mặc định (ví dụ: cuộn trang)
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    } else if (mode === 'paint' && e.button === 0) { // Left mouse button for drawing
      e.preventDefault(); // Ngăn chặn hành vi mặc định (ví dụ: chọn văn bản)
      setIsDrawing(true);
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
      setPaths(prev => [...prev, [{ x, y }]]);
    }
  };

  // Hàm xử lý khi di chuyển chuột
  const handleMouseMove = (e) => {
    if (isPanning && mode === 'drag') {
      setTranslate({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (isDrawing && mode === 'paint') {
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
      setPaths(prev => {
        const newPaths = [...prev];
        const currentPath = newPaths[newPaths.length - 1];
        currentPath.push({ x, y });
        return newPaths;
      });
    }
  };

  // Hàm xử lý khi thả chuột
  const handleMouseUp = (e) => {
    if (mode === 'drag' && e.button === 0) { // Middle mouse button
      setIsPanning(false);
    }
    if (mode === 'paint' && e.button === 0) { // Left mouse button
      setIsDrawing(false);
    }
  };

  // Hàm xử lý khi chuột rời khỏi khu vực tương tác
  const handleMouseLeave = () => {
    setIsPanning(false);
    setIsDrawing(false);
  };

  // Hàm tính toán kiểu biến đổi cho các phần tử con
  const getTransformedStyle = () => ({
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  });

  // Hàm thay đổi chế độ vẽ
  const handleChangeModePaint = () => {
    setMode(prevMode => (prevMode === 'paint' ? 'idle' : 'paint'));
    console.log('now Mode: ', mode === 'paint' ? 'Idle' : 'Paint');
  };

  // Hàm thay đổi chế độ kéo
  const handleChangeModeDrag = () => { 
    setMode(prevMode => (prevMode === 'drag' ? 'idle' : 'drag'));
    console.log('now Mode: ', mode === 'drag' ? 'Idle' : 'Drag');
  };


  return (
    <div
      className="relative bg-slate-700"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
      onWheel={handleZoom} // Gắn sự kiện zoom lên phần tử cha
      onMouseDown={handleMouseDown} // Gắn sự kiện mouse down lên phần tử cha
      onMouseMove={handleMouseMove} // Gắn sự kiện mouse move lên phần tử cha
      onMouseUp={handleMouseUp}     // Gắn sự kiện mouse up lên phần tử cha
      onMouseLeave={handleMouseLeave} // Gắn sự kiện mouse leave lên phần tử cha
    >
      {/* Canvas cho lưới */}
      <canvas
        ref={gridCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: mode === 'drag' ? 'grabbing' : mode === 'paint' ? 'crosshair' : 'default',
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Cho phép phần tử cha nhận sự kiện
        }}
      />

      {/* Canvas cho vẽ */}
      <canvas
        ref={drawCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: mode === 'drag' ? 'grabbing' : mode === 'paint' ? 'crosshair' : 'default',
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Cho phép phần tử cha nhận sự kiện
        }}
      />


        <div className='absolute top-0 bg-red-600' 
        style={getTransformedStyle()}
        >         
            {children}

        </div>



    </div>
  );
};

export default ZoomableGrid;

