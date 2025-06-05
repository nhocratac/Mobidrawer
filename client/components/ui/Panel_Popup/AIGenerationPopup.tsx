import { geminiGenerateImage } from "@/api/AiApi";
import { useBoard } from "@/app/user/board/[id]/useBoard";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";


type GeneratedImage = {
  imageUrl: string;
  base64Data: string;
};

interface AIGenerationPopupProps {
  togglePopup: () => void;
  handleAddImageNote: (payload: {
    alt: string;
    url: string;
    cloudinaryId: string;
    size: { width: number; height: number };
    position: { x: number; y: number };
  }) => void;
}



const AIGenerationPopup: React.FC<AIGenerationPopupProps> = ({
  togglePopup
}) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([
  ]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {handleAddImageNote} = useBoard()

  // Clear text functionality
  const handleClearText = () => {
    setPrompt("");
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleGenerateImage = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await geminiGenerateImage(prompt);

      if (result.images.length > 0) {
        setGeneratedImages(result.images);
        // Tạo sticky note trực tiếp nếu muốn show ngay
        if (result.images[0].imageUrl) {
          try {
            // Ví dụ: show trước lên board (tùy bạn dùng createImageStickyNoteOnBoard)
            // createImageStickyNoteOnBoard(result.images[0].imageUrl, "bg-white");
          } catch (err) {
            console.error("Failed to create image sticky note:", err);
          }
        }
      } else {
        setError("Không có hình ảnh nào được tạo. Vui lòng thử prompt khác.");
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError("Tạo hình ảnh thất bại. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  // Khi component mount, focus vào textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  function ensureDataURI(base64: string, mime = "image/png") {
    if (!base64.startsWith("data:")) {
      return `data:${mime};base64,${base64}`;
    }
    return base64;
  }

  // Chuyển data URI sang Blob để upload
  function dataURItoBlob(dataURI: string): Blob {
    const parts = dataURI.split(',');
    if (parts.length !== 2) {
      throw new Error("Invalid data URI format");
    }

    const byteString = atob(decodeURIComponent(parts[1])); // 🛠️ Decode URI component
    const mimeString = parts[0].split(':')[1].split(';')[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  }

  // Hàm xử lý khi bấm "Thêm vào bảng" dưới mỗi ảnh
  const handleAddToBoard = async (
    image: GeneratedImage,
    index: number
  ) => {
    const userId = useTokenStore.getState().user?.id || "";
    if (!userId) {
      console.error("Chưa có userId, không thể upload");
      return;
    }

    try {
      setUploadingIndex(index);

      // 1. Chuyển base64 sang Blob
      const correctedBase64 = ensureDataURI(image.base64Data);
      const blob = dataURItoBlob(correctedBase64);

      // 2. Tạo FormData tương tự handleImageUpload
      const formData = new FormData();
      formData.append("file", blob, `generated-${Date.now()}.png`);
      formData.append("userId", userId);

      // 3. Gửi lên Next.js API để upload vào Cloudinary
      console.log("Đang upload hình ảnh...");
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.url && data.id) {
        console.log("Upload thành công:", data.url);

        // 4. Gọi handleAddImageNote (gửi đến Spring Boot) để lưu metadata vào MongoDB
        handleAddImageNote({
          alt: prompt || `AI-generated ${index + 1}`,
          url: data.url,
          cloudinaryId: data.id,
          size: {
            width: 200,
            height: 200,
          },
          position: {
            x: 0,
            y: 0,
          },
        });
      } else {
        console.error("Upload thất bại:", data.error || data.message);
      }
    } catch (error) {
      console.error("Lỗi khi thêm vào bảng:", error);
    } finally {
      setUploadingIndex(null);
    }
  };

  // Hàm download hình ảnh (giữ nguyên)
  const handleDownloadImage = (imageUrl: string, index: number) => {
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

        <button
          className="absolute top-2 right-2 w-[24px] h-[24px] text-white hover:text-gray-200"
          onClick={togglePopup}
        >
          <XMarkIcon className="w-full h-full" />
        </button>
      </div>

      <div className="w-full px-6 py-2">
        <label
          htmlFor="imagePrompt"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
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
            style={{ minWidth: "180px" }}
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
              <div
                key={index}
                className="rounded-lg overflow-hidden shadow-md relative group"
              >
                <img
                  src={image.imageUrl || image.base64Data}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    className={`bg-white text-black px-3 py-1 rounded-lg shadow-md hover:bg-gray-100 flex items-center gap-1 ${uploadingIndex === index
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                      }`}
                    onClick={() => handleAddToBoard(image, index)}
                    disabled={uploadingIndex === index}
                  >
                    {uploadingIndex === index
                      ? "Đang thêm..."
                      : "Thêm vào bảng"}
                  </button>
                  <button
                    className="bg-white text-black px-3 py-1 rounded-lg shadow-md hover:bg-gray-100 flex items-center gap-1"
                    onClick={() =>
                      handleDownloadImage(
                        image.imageUrl || image.base64Data,
                        index
                      )
                    }
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    <span>Download</span>
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
