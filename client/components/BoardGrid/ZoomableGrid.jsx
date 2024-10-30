import { useToolDevStore } from "@/lib/Zustand/store";
import { useEffect, useRef, useState } from "react";
import PencilCanvas from "../CanvasDrawingOverlay/PencilCanvas";

const ZoomableGrid = ({ children, onSetScale }) => {
  const gridCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);

  // Trạng thái quản lý scale và dịch chuyển
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const penColor = useToolDevStore((state) => state.pencil?.color);
  const penThickness = useToolDevStore((state) => state.pencil?.thickness);
  const penOpacity = useToolDevStore((state) => state.pencil?.opacity);
  // Trạng thái quản lý chế độ và hành động hiện tại
  // const [mode, setMode] = useState('idle'); // Các chế độ: 'drag', 'pen', 'idle'
  const mode = useToolDevStore((state) => state.mode);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoPressed, setUndoPressed] = useState(false);

  // Trạng thái lưu vị trí bắt đầu của thao tác
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Trạng thái lưu trữ các đường vẽ
  const [canvasPaths, setCanvasPaths] = useState([
    {
      color: penColor,
      thickness: penThickness,
      opacity : penOpacity,
      path: [],
    },
  ]); // {}

  const setonePathInArrayPath = (index, newPath) => {
    setCanvasPaths(prevPaths => {
      // Tạo một bản sao của paths hiện tại
      const updatedPaths = [...prevPaths];
      
      // Thay thế path tại vị trí index bằng newPath
      if (index >= 0 && index < updatedPaths.length) {
        updatedPaths[index] = newPath;
      } else {
        console.warn("Index out of range");
      }
      
      return updatedPaths;
    });
  };

  // Hàm tiện ích để chuyển đổi tọa độ
  const getTransformedCoordinates = (x, y) => { // chuyển điểm hiện tại trên  màn hình thành tọa độ gốc trên canvass
    return {
      x: (x - translate.x - penThickness/2) / scale,
      y: (y - translate.y - penThickness/2) / scale,
    };
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        if (!undoPressed) {
          // Kiểm tra cờ để tránh gọi nhiều lần
          e.preventDefault();
          setCanvasPaths((prevPaths) => {
            if (prevPaths.length === 0) return prevPaths; // Không làm gì nếu không còn path
            return prevPaths.slice(0, -1); // Loại bỏ đường vẽ cuối cùng
          });
          setUndoPressed(true); // Đặt cờ để ngăn xử lý lặp lại
        }
      }
    };
    const data = {
      address: "",
    };
    const handleKeyUp = (e) => {
      if (e.key === "z") {
        setUndoPressed(false); // Reset cờ khi thả phím
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const gridCtx = gridCanvas.getContext("2d");
    const drawCanvas = drawCanvasRef.current;
    const drawCtx = drawCanvas.getContext("2d");

    // add event listener undo

    // Hàm điều chỉnh kích thước canvas khi cửa sổ thay đổi
    const resizeCanvases = () => {
      gridCanvas.width = window.innerWidth;
      gridCanvas.height = window.innerHeight;
      drawCanvas.width = window.innerWidth;
      drawCanvas.height = window.innerHeight;
      drawGrid();
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
      gridCtx.strokeStyle = "#ddd";
      gridCtx.lineWidth = 0.1;

      // Vẽ các đường thẳng dọc
      for (
        let x = -gridCanvas.width;
        x < (gridCanvas.width * 2) / scale;
        x += gridSize
      ) {
        gridCtx.beginPath();
        gridCtx.moveTo(x, -gridCanvas.height);
        gridCtx.lineTo(x, (gridCanvas.height * 2) / scale);
        gridCtx.stroke();
      }

      // Vẽ các đường thẳng ngang
      for (
        let y = -gridCanvas.height;
        y < (gridCanvas.height * 2) / scale;
        y += gridSize
      ) {
        gridCtx.beginPath();
        gridCtx.moveTo(-gridCanvas.width, y);
        gridCtx.lineTo((gridCanvas.width * 2) / scale, y);
        gridCtx.stroke();
      }

      gridCtx.restore();
    };

    // Hàm vẽ lại các đường đã vẽ bởi người dùng

    // Khởi tạo kích thước canvas khi component mounts
    resizeCanvases();
    window.addEventListener("resize", resizeCanvases); // Thêm chỉ một lần
    // Vẽ lại lưới và các đường vẽ khi scale hoặc translate thay đổi
    const drawAll = () => {
      drawGrid();
    };

    drawAll();

    return () => {
      window.removeEventListener("resize", resizeCanvases);
    };
  }, [scale, translate, canvasPaths]);

  // Hàm xử lý zoom khi cuộn chuột
  const handleZoom = (e) => {
    //e.preventDefault(); // Ngăn chặn hành vi mặc định của trình duyệt
    const delta = -e.deltaY;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    let newScale = scale * zoomFactor;
    newScale = Math.min(Math.max(0.5, newScale), 5); // Giới hạn scale từ 0.5 đến 5
    setScale(newScale);
    if (onSetScale) onSetScale(newScale);
  };

  // Hàm xử lý khi nhấn chuột
  const handleMouseDown = (e) => {
    if (mode === "drag" && e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    } else if (mode === "pen" && e.button === 0) {
      e.preventDefault();
      setIsDrawing(true);
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);
      // Thêm một đường vẽ mới với màu và độ dày hiện tại
      setCanvasPaths((prev) => {
        // Tạo bản sao của canvasPaths
        const newPaths = [...prev];
        newPaths.push({
          color: penColor,
          thickness: penThickness,
          opacity: penOpacity,
          path: [{ x, y }],
        });
        return newPaths;
      });
    }
  };
  // Hàm xử lý khi di chuyển chuột
  const addPointToPath = (x, y) => {
    setCanvasPaths((prev) => {
      // Tạo bản sao của canvasPaths
      const newPaths = [...prev];

      // Lấy đối tượng cuối cùng trong mảng
      const currentPathObj = newPaths[newPaths.length - 1];

      // Tạo một bản sao của currentPathObj
      const newPathObj = {
        ...currentPathObj,
        path: [...currentPathObj.path], // Sao chép mảng path hiện tại
      };

      // Thêm điểm mới vào path
      newPathObj.path.push({ x, y });

      // Thay thế đối tượng cuối cùng bằng bản sao đã cập nhật
      newPaths[newPaths.length - 1] = newPathObj;

      return newPaths; // Trả về mảng mới
    });
  };
  const handleMouseMove = (e) => {
    if (isPanning && mode === "drag") {
      setTranslate({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (isDrawing && mode === "pen") {
      const { x, y } = getTransformedCoordinates(e.clientX, e.clientY);

      // Cập nhật đường vẽ hiện tại
      addPointToPath(x, y);
    }
  };

  // Hàm xử lý khi thả chuột
  const handleMouseUp = (e) => {
    if (mode === "drag" && e.button === 0) {
      // Middle mouse button
      setIsPanning(false);
    }
    if (mode === "pen" && e.button === 0) {
      // Left mouse button
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
    transformOrigin: "0 0",
  });

  return (
    <div
      className="relative bg-slate-700"
      style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
      onWheel={handleZoom} // Gắn sự kiện zoom lên phần tử cha
      onMouseDown={handleMouseDown} // Gắn sự kiện mouse down lên phần tử cha
      onMouseMove={handleMouseMove} // Gắn sự kiện mouse move lên phần tử cha
      onMouseUp={handleMouseUp} // Gắn sự kiện mouse up lên phần tử cha
      onMouseLeave={handleMouseLeave} // Gắn sự kiện mouse leave lên phần tử cha
    >
      {/* Canvas cho lưới */}
      <canvas
        ref={gridCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor:
            mode === "drag"
              ? "grabbing"
              : mode === "pen"
              ? "pointer"
              : "default",
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />

      {/* Canvas cho vẽ */}
      <canvas
        ref={drawCanvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor:
            mode === "drag"
              ? "grabbing"
              : mode === "pen"
              ? "pointer"
              : "default",
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none", // Để tránh chồng lấp với các sự kiện canvas
        }}
      >
        {canvasPaths.map((pathData, index) => (
          <PencilCanvas
            key={index}
            color={pathData.color}
            thickness={pathData.thickness}
            path={pathData.path}
            opacity={pathData.opacity}
            scale={scale}
            translate={translate}
            setPath={setonePathInArrayPath}
          />
        ))}
      </div>

      <div className="absolute top-0 bg-red-600" style={getTransformedStyle()}>
        {children}
      </div>
    </div>
  );
};

export default ZoomableGrid;
