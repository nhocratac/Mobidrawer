import React, { useRef, useState, useEffect , MouseEvent} from 'react';

interface DrawingCanvasProps {
    imgUrl: string,
    width: number,
    height: number,
    [key:string]:any,
}

const DrawingCanvas =({ imgUrl, width = 200, height = 200 }:DrawingCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement|null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [maskColor, setMaskColor] = useState([255, 30, 0, 255]); // Default color


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas?.getContext('2d');
        if (!context) return;
        context.lineWidth = 30;
        context.strokeStyle = `rgba(${maskColor[0]},${maskColor[1]},${maskColor[2]},${maskColor[3] / 255})`;
        context.lineJoin = 'round';
        context.lineCap = 'round';
    }, [maskColor]);

    const startDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        draw(e);
    };

  
    const finishDrawing = () => {
        setIsDrawing(false);
        const context = canvasRef.current?.getContext('2d');
        if (context) {
            context.beginPath();
        }
    };

    const draw = (e:MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        context.lineTo(x, y);
        context.stroke();
        context.beginPath();
        context.moveTo(x, y);
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={{ border: '1px solid white', position: 'absolute', zIndex: 1 }}
                onMouseDown={startDrawing}
                onMouseUp={finishDrawing}
                onMouseMove={draw}
            />
            <img
                src={imgUrl}
                alt="Background"
                style={{ width, height, position: 'relative', zIndex: -1 }}
            />
        </div>
    );
};

export default DrawingCanvas;

export function getMaskData() {
    const canvasRef = document.querySelector('canvas');
    if (!canvasRef) return null;
    const context = (canvasRef as HTMLCanvasElement).getContext('2d'); // Cast to HTMLCanvasElement
    if (!context) return null;
    const imageData = context.getImageData(0, 0, canvasRef.width, canvasRef.height);
    return imageData.data; // RGBA array
}