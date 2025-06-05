import { useBoard } from "@/app/user/board/[id]/useBoard";
import { Button } from "@/components/ui/button";
import { useImageNoteStore } from "@/lib/Zustand/ImageNoteStore";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { useRef, useState } from "react";

export default function ImageTool() {
    const inputRef = useRef<HTMLInputElement>(null);
    const { handleAddImageNote } = useBoard();
    const [uploadingImages, setUploadingImages] = useState<
        { url: string }[]
    >([]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            const formData = new FormData();
            formData.append("file", file);
            formData.append("userId", useTokenStore.getState().user?.id || "");
            // add to uploadingImages state for preview
            const previewUrl = URL.createObjectURL(file);
            setUploadingImages((prev) => [
                ...prev,
                { url: previewUrl },
            ]);

            // fecth to nextjs
            fetch("/api/upload-image", {
                method: "POST",
                body: formData,
            })
                .then(response => response.json())
                .then(data => {
                    console.log("Upload response:", data);
                    if (data.url && data.id) {
                        console.log("Image uploaded successfully:", data.url);
                        // call socket api
                        handleAddImageNote({
                            alt: file.name,
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
                        console.error("Image upload failed:", data.error || data.message);
                    }
                })
                .catch(error => {
                    console.error("Error uploading image:", error);
                })
                .finally(() => {
                    // Reset the input field
                    setUploadingImages([]);
                    if (inputRef.current) {
                        inputRef.current.value = "";
                    }
                });
            // setTimeout(() => {
            //     setUploadingImages((prev) => prev.filter(img => img.url !== previewUrl));
            // }, 3000); // Remove preview after 3 seconds
        }
    }


    return (
        <div className="w-[350px] h-full overflow-y-hidden bg-white transform translate-x-[50px] rounded-3xl px-4">
            <Button variant={"secondary"} className="w-full h-12 mb-2 text-4xl mt-8" onClick={() => inputRef.current?.click()}>
                Thêm hình ảnh
            </Button>
            <input
                type="file"
                accept="image/*"
                ref={inputRef}
                onChange={handleImageUpload}
                className="hidden"
            />
            <ImageList uploadingImages={uploadingImages} />
        </div>
    )
}


// component Image List 
const ImageList = ({ uploadingImages }: { uploadingImages: { url: string }[] }) => {
    const { imageNotes } = useImageNoteStore();
    return (
        <>
            {
                imageNotes.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        {imageNotes.map((imageNote, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                                <img src={imageNote.url} alt={`Image ${index + 1}`} className="w-16 h-16 object-cover rounded" />
                                {/* <span className="text-sm">{imageNote.caption}</span> */}
                            </div>
                        ))}
                        {
                            uploadingImages.map((image, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg opacity-50 relative">
                                    <img src={image.url} alt={`Uploading Image ${index + 1}`} className="w-16 h-16 object-cover rounded" />
                                    {/* <span className="text-sm">Đang tải lên...</span> */}
                                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-50 rounded">
                                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-gray-500 text-sm mb-4">Kéo và thả hình ảnh vào đây</p>
                        <div className="w-full h-32 border-dashed border-2 border-gray-300 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400">Thả hình ảnh tại đây</span>
                        </div>
                    </div>
                )
            }
        </>
    );
}
