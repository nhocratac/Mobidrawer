'use client';
import React, { useRef, useState } from 'react';
import DrawingCanvas from "@/app/_components/InPaintMask";
import ResizableDraggableBox from "@/app/_components/DraggableResizableBox"
import { getMaskData } from '@/app/_components/InPaintMask';
interface IPLayGroundProps {
    params: {
        playgroundID: string;
    };
}

const PlayGroundPage = ({ params }: IPLayGroundProps) => {
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState('');


    const onSubmitAIGeneration = async (text: string) => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:4000/ai/generation');
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setImageUrl(data.imageUrl);
            console.log(data.imageUrl);
        } catch (error) {
            console.error('Error fetching image:', error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmitInPaint = async () => {
        // Get the RGBA data from the canvas
        const rgbaData = getMaskData();
        try {
            const response = await fetch('http://localhost:4000/ai/inPaint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageUrl }), // Send base64 data or raw image data
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Server response:', data);
        } catch (error) {
            console.log("err" + error)
        }
     
    };

    // use to check if it return correct image mask
    const rgbaDataToImage = (rgbaData: any, width: any, height: any) => {
        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const imageData = (canvas.getContext('2d'))?.createImageData(width, height);
        if (imageData == null) return;
        for (let i = 0; i < rgbaData.length; i++) {
            imageData.data[i] = rgbaData[i];
        }

        (canvas.getContext('2d'))?.putImageData(imageData, 0, 0);

        const imageUrl = canvas.toDataURL();
        return imageUrl;
    };



    return (
        <div className="bg-transparent w-full h-screen flex flex-col gap-4">
            <h1 className="text-white">PLAYGROUND PAGE {params.playgroundID}</h1>
            <div className="flex flex-row gap-5" >
                <input
                    className="text-black"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button
                    className="border border-solid rounded-5"
                    onClick={() => onSubmitAIGeneration(inputText)}
                    disabled={loading}
                >
                    {loading ? 'Generating...' : 'Submit'}
                </button>


            </div>

            {/* this use for showing image Generation result */}
            <ResizableDraggableBox imageUrl={imageUrl} />


            {/* this use for inPaint image */}
            {/* <DrawingCanvas imgUrl={"http://localhost:4000/test.png"} width={200} height={200} />
            <button onClick={onSubmitInPaint}>SUBMIT</button> */}
        </div>
    );
};

export default PlayGroundPage;
