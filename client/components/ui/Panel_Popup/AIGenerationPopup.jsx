import { XMarkIcon, SparklesIcon } from "@heroicons/react/16/solid";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useRef } from "react";
import { geminiGenerateImage } from "@/api/AiApi";
// import { createImageStickyNoteOnBoard } from "@/app/user/board/[id]/page";

const AIGenerationPopup = ({ togglePopup }) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Clear text functionality
  const handleClearText = () => {
    setPrompt("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleGenerateImage = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await geminiGenerateImage(prompt);

      if (result.images.length > 0) {
        setGeneratedImages(result.images);
        
        // Create a sticky note with the generated image
        if (result.images[0].imageUrl) {
          try {
            createImageStickyNoteOnBoard(result.images[0].imageUrl, "bg-white");
          } catch (err) {
            console.error("Failed to create image sticky note:", err);
            // Don't show error to user since the image was still generated
          }
        }
      } else {
        setError("No images were generated. Please try a different prompt.");
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Failed to generate image. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Focus the textarea on component mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // const handleImageClick = (imageUrl) => {
  //   try {
  //     createImageStickyNoteOnBoard(imageUrl, "bg-white");
  //   } catch (err) {
  //     console.error("Failed to create image sticky note:", err);
  //   }
  // };

  // Handle image download
  const handleDownloadImage = (imageUrl, index) => {
    // Create a temporary anchor element
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `ai-generated-image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white w-full h-full flex flex-col gap-3 items-center shadow-lg rounded-lg">
      <div className="w-full h-[80px] bg-gradient-to-r from-teal-500 to-blue-500 relative flex justify-center items-center">
        <h2 className="text-xl font-semibold text-white">Tạo mẫu bằng AI</h2>

        <button className="absolute top-2 right-2 w-[24px] h-[24px] text-white hover:text-gray-200" onClick={togglePopup}>
          <XMarkIcon className="w-full h-full" />
        </button>
      </div>
      
      <div className="w-full px-6 py-2">
        <label htmlFor="imagePrompt" className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả hình ảnh bạn muốn tạo
        </label>
        <div className="relative">
          <textarea 
            ref={textareaRef}
            id="imagePrompt"
            className="w-full min-h-[100px] p-3 border rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none text-gray-800"
            placeholder="Mô tả chi tiết về hình ảnh bạn muốn (VD: Một bãi biển nhiệt đới với nước trong xanh và cây dừa)"
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                // Allow normal backspace behavior
                return true;
              }
            }}
          />
          {prompt && (
            <button 
              onClick={handleClearText}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              aria-label="Clear text"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
          <button 
          className="text-[16px] rounded-full h-[48px] px-6 flex gap-2 bg-teal-500 hover:bg-teal-600 text-white justify-center items-center transition-colors"
          onClick={handleGenerateImage}
          disabled={isLoading || !prompt.trim()}
          style={{ minWidth: '180px' }}
        >
          {isLoading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              <span className="ml-2">Đang tạo...</span>
            </>
          ) : (
            <>
              <SparklesIcon className="h-5 w-5" />
              <span>Tạo hình ảnh</span>
            </>
          )}
        </button>
        </div>
      </div>
      
      {error && (
        <div className="w-full px-6">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
      
      <div className="w-full px-6 flex-1 overflow-auto">
        {isLoading ? (
          <div className="w-full h-full flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
          </div>
        ) : generatedImages.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {generatedImages.map((image, index) => (
              <div key={index} className="rounded-lg overflow-hidden shadow-md relative group">
                <img 
                  src={image.imageUrl || image.base64Data} 
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  {/* <button 
                    className="bg-white text-black px-4 py-2 rounded-lg shadow-md hover:bg-gray-100"
                    onClick={() => handleImageClick(image.imageUrl || image.base64Data)}
                  >
                    Add to Board
                  </button> */}
                  <button 
                    className="bg-white text-black px-4 py-2 rounded-lg shadow-md hover:bg-gray-100 flex items-center gap-1"
                    onClick={() => handleDownloadImage(image.imageUrl || image.base64Data, index)}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex justify-center items-center text-gray-400">
            <p>Hình ảnh được tạo sẽ xuất hiện ở đây</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIGenerationPopup;
