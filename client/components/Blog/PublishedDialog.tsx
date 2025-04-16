import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import Image from "next/image";
import { Button } from "../ui/button";
import { uploadFile } from "@/app/action";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useToast } from "@/hooks/use-toast";
import blogAPIs from "@/api/blogAPI";
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { generateSlug } from "@/lib/utils";

const PublishedDialog = ({
  children,
  blog: {
    id,
    thumbnail,
    description: savedDescription,
    keywords: savedKeywords,
    isPublished: savedIsPublished,
    title,
  },
}: {
  children: React.ReactNode;
  blog: Partial<Blog>;
}) => {
  const [thumbnailURL, setThumbnailURL] = useState(thumbnail);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [description, setDescription] = useState(savedDescription || "");
  const [isPublished, setIsPublished] = useState<boolean>(
    savedIsPublished as boolean
  );
  const [keywords, setKewords] = useState<string>(
    savedKeywords?.join(", ") || ""
  );
  const { user } = useTokenStore();
  const { toast } = useToast();
  const router = useRouter();

  const handlePublish = async () => {
    let savedUrl = thumbnailURL;
    if(!user) return 

    if (!description || !keywords || !thumbnailURL || !title) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
      });
      return;
    }
    try {
      if(!user) return null
      toast({
        title: "Đang xuất bản",
        description: "Vui lòng chờ trong giây lát",
      });
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("file", thumbnailFile);
        const { url } = await uploadFile(formData, user.id);
        savedUrl = url;
        setThumbnailURL(url);
        setThumbnailFile(null);
      }
      if (!id) return;
      const slug = generateSlug(title);
      console.log("slug", slug);

      const blog = await blogAPIs.updateBlog(id, {
        description,
        keywords: keywords
          .split(",")
          .map((keyword) => keyword.toLowerCase().trim()),
        thumbnail: savedUrl,
        isPublished,
        slug
      });
      console.log("blog", blog);

      toast({
        title: "Xuất bản thành công",
        description: "Bài viết của bạn đã được xuất bản",
      });
      router.push(`/Blog/${slug}?id=${id}`);
    } catch (error) {
      console.log(error);
      toast({
        title: "Xuất bản không thành công",
        description: "Bài viết của bạn không thể xuất bản",
        variant: "destructive"
      });
    }
  };

  // console.log("savedIsPublished", savedIsPublished);
  // console.log(isPublished);
  return (
    <Dialog>
      {children}
      <DialogContent className="max-w-[300px] sm:max-w-[580px] md:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Xem trước</DialogTitle>
        </DialogHeader>
        <div className="flex gap-10 flex-wrap">
          <div>
            <input
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;

                const formData = new FormData();
                formData.append("file", files[0]);
                setThumbnailURL(URL.createObjectURL(files[0]));
                setThumbnailFile(files[0]);
              }}
              placeholder="Ảnh thumbnail"
              className="text-xl font-bold p-5 px-10"
              type="file"
              accept="image/*"
            />

            {thumbnailURL && (
              <div className="flex justify-center">
                <Image
                  src={thumbnailURL}
                  alt="thumbnail"
                  width={300}
                  height={200}
                  className="cursor-default rounded-xl"
                />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-10">
            <div className="relative">
              <Textarea
                value={description}
                onChange={(e) => {
                  if (e.target.value.length > 160) return;
                  setDescription(e.target.value);
                }}
                placeholder="Mô tả"
                style={{
                  fontSize: "1.6rem",
                }}
                className="p-5 resize-none"
              />
              <p className="absolute bottom-0 right-5 text-xl">
                {description.length}/160
              </p>
            </div>
            <div>
              <Input
                value={keywords}
                onChange={(e) => setKewords(e.target.value)}
                placeholder="Từ khóa"
                style={{
                  fontSize: "1.6rem",
                }}
                className="p-5"
              />
              <p className="text-xl mt-5">
                Lưu ý: mỗi từ khóa cách nhau bằng một dấu ,
              </p>
            </div>

            <RadioGroup
              defaultValue={isPublished ? "publish" : "draft"}
              onValueChange={(value) => {
                if (value === "draft") setIsPublished(false);
                else setIsPublished(true);
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="draft" id="r1" className="w-6 h-6" />
                <Label htmlFor="r1" className="text-2xl">
                  Draft
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="publish" id="r2" className="w-6 h-6" />
                <Label htmlFor="r2" className="text-2xl">
                  Publish
                </Label>
              </div>
            </RadioGroup>

            <Button className="text-xl" onClick={handlePublish}>
              Xuất bản ngay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishedDialog;
