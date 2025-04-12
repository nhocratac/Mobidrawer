import { Button } from "@/components/ui/button";
import { Image as ImgIcon } from "lucide-react";
import React, { ChangeEvent, useRef } from "react";
import { useSlate } from "slate-react";
import { uploadFile } from "../../app/action";
import { ImageElement, ParagraphElement } from "./types";
import { Transforms } from "slate";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { useToast } from "@/hooks/use-toast";

const InsertButton = ({ insertType }: { insertType: "image" }) => {
  const editor = useSlate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useTokenStore();
  const { toast } = useToast();

  const Icon = ({ size }: { size: number }) => {
    switch (insertType) {
      case "image":
        return <ImgIcon size={size} />;
    }
  };
  const handleInsert = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;

      if (!files) return;

      toast({
        title: "Image uploading...",
        description: "Please wait a moment",
      });

      const formData = new FormData();
      formData.append("file", files[0]);
      if (!user) return null;
      const result = await uploadFile(formData, user.id);

      // Insert new element to editor
      if (result) {
        const text = { text: "" };
        const image: ImageElement = {
          type: "image",
          url: result.url,
          alt: result.alt,
          children: [text],
        };
        Transforms.insertNodes(editor, image);
        const paragraph: ParagraphElement = {
          type: "paragraph",
          children: [{ text: "" }],
        };
        Transforms.insertNodes(editor, paragraph);
      }

      toast({
        title: "Image uploaded successfully!",
      });
    } catch (error) {
      console.log("upload image fail ", error);
      toast({
        title: "Image uploaded fail",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      // Clean input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <Button
        onClick={() => {
          if (insertType == "image") {
            fileInputRef.current?.click();
          }
        }}
        variant={"ghost"}
      >
        <Icon size={20} />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept={insertType == "image" ? "image/*" : "video/*"}
        className="hidden"
        onChange={handleInsert}
      />
    </div>
  );
};

export default InsertButton;
