'use client';
import ZoomableGrid from '@/components/BoardGrid/ZoomableGrid';
import RNDBase from "@/components/BoxResizable/RNDBase";
import RNDStickyNote from '@/components/BoxResizable/RNDStickyNote';
import RNDText from '@/components/BoxResizable/RNDText';
import LeftToolBar from '@/components/SideBar/LeftToolBar';
import React, { useEffect, useState } from 'react';

interface IPLayGroundProps {
  params: {
    playgroundID: string;
  };
}

type ShapeComponent = React.FC<React.SVGProps<SVGSVGElement>>;

const PlayGroundPage = ({ }: IPLayGroundProps) => {
  useEffect(() => {
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
  }, []);


  const [scale, setScale] = useState(1);
  const [textItemCount, setTextItemCount] = useState(0);
  const [stickyNoteItemCount, setStickyNoteItemCount] = useState(0);
  const [shapeList, setShapeList] = useState<ShapeComponent[]>([]);

  const [stickyNoteColors, setStickyNoteColors] = useState<string[]>([]);

  const onClickCreateStickyNote = (colorName: string) => {
    setStickyNoteItemCount(stickyNoteItemCount + 1);
    setStickyNoteColors((prevColors) => [...prevColors, colorName]);
  };



  const setScaleHanle = (s: number) => {
    setScale(s);
  };

  const onClickAddShape = (shape: ShapeComponent) => {
    setShapeList([...shapeList, shape]);
  };

  return (
    <div className="w-screen h-screen bg-slate-500">
      <LeftToolBar
        onClickTextButton={() => setTextItemCount(textItemCount + 1)}
        onClickStickyNoteButton={onClickCreateStickyNote}
        onClickShape={onClickAddShape}
      />
      <ZoomableGrid onSetScale={setScaleHanle}>
        {Array.from({ length: textItemCount }).map((_, index) => (
          <RNDText key={index} parentScale={scale} />
        ))}

        {Array.from({ length: stickyNoteItemCount }).map((_, index) => (
          <RNDStickyNote key={index} parentScale={scale} colorString={stickyNoteColors[index]} />
        ))}

        {shapeList.map((ShapeComponent, index) => (
          <RNDBase key={index} parentScale={scale}  >
            <ShapeComponent />
          </RNDBase>
        ))}
      </ZoomableGrid>
    </div>
  );
};

export default PlayGroundPage;

// const [inputText, setInputText] = useState('');
// const [loading, setLoading] = useState(false);
// const [imageUrl, setImageUrl] = useState('');
// const onSubmitAIGeneration = async (text: string) => {
//   setLoading(true);
//   try {
//     const res = await fetch('http://localhost:4000/ai/generation');
//     if (!res.ok) {
//       throw new Error(`HTTP error! status: ${res.status}`);
//     }
//     const data = await res.json();
//     setImageUrl(data.imageUrl);
//     console.log(data.imageUrl);
//   } catch (error) {
//     console.error('Error fetching image:', error);
//   } finally {
//     setLoading(false);
//   }
// };

// const onSubmitInPaint = async () => {
//   const rgbaData = getMaskData();
//   try {
//     const response = await fetch('http://localhost:4000/ai/inPaint', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ image: imageUrl, prompt: "remove it " }),
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log('Server response:', data);
//   } catch (error) {
//     console.log("Error:", error);
//   }
// };

// const rgbaDataToImage = (rgbaData: any, width: any, height: any) => {
//   const canvas = document.createElement('canvas');

//   canvas.width = width;
//   canvas.height = height;

//   const imageData = (canvas.getContext('2d'))?.createImageData(width, height);
//   if (imageData == null) return;
//   for (let i = 0; i < rgbaData.length; i++) {
//     imageData.data[i] = rgbaData[i];
//   }

//   (canvas.getContext('2d'))?.putImageData(imageData, 0, 0);

//   const imageUrl = canvas.toDataURL();
//   return imageUrl;
// };