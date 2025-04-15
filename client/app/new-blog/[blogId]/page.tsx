"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { Descendant } from "slate";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useDebounce from "@/hooks/useDebounce";
import blogAPIs from "@/api/blogAPI";
import TextEditor from "@/components/TextEditor/TextEditor";
import { ChevronLeft } from "lucide-react";
import PublishedDialog from "@/components/Blog/PublishedDialog";
import { DialogTrigger } from "@/components/ui/dialog";
import useTokenStore from "@/lib/Zustand/tokenStore";

const initialValue: Descendant[] = [
  { type: "paragraph", children: [{ text: "" }] },
];

const NewBlog = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [blog, setBlog] = useState<Blog>();
  const [content, setContent] = useState<Descendant[]>(initialValue);
  const [title, setTitle] = useState("");
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { user } = useTokenStore();
  const pathName = usePathname();

  const blogDebounce = useDebounce(content, 4000);

  useEffect(() => {
    const blogId = pathName.split("/")[2];

    if (!user || !blogId) return;

    const getBlog = async () => {
      try {
        const blog: Blog = await blogAPIs.getBlogById(blogId);

        if (typeof blog.owner !== "string" && blog.owner.id !== user.id) {
          router.push("/404");
          return;
        }

        setTitle(blog.title ?? "");
        if (blog.content) setContent(JSON.parse(blog.content));
        setBlog(blog);
      } catch (error) {
        console.log(error);
      }
    };

    getBlog();
  }, [pathName, router, user]);

  useEffect(() => {
    if (isSaved) {
      window.onbeforeunload = null;
      return;
    }

    window.onbeforeunload = () => "Bạn có chắc chắn muốn rời khỏi trang này?";

    return () => {
      window.onbeforeunload = null;
    };
  }, [isSaved]);

  useEffect(() => {
    if (!isSaved) {
      handleSaveBlog();
      console.log("Saving blog...");
    }
  }, [blogDebounce]);

  const handleSaveBlog = async () => {
    if (!blog?.id) return;

    setIsSaving(true);

    const updatedBlog: Partial<Blog> = {
      title,
      content: JSON.stringify(content),
      isPublished: blog.isPublished || false,
      owner: blog.owner,
      id: blog.id,
    };

    try {
      const savedBlog = await blogAPIs.updateBlog(blog.id, updatedBlog);
      console.log(savedBlog);
    } catch (error) {
      console.log(error);
    }

    setIsSaving(false);
    setIsSaved(true);
  };

  if (!user) return null;

  return (
    <>
      {blog ? (
        <div className="no-reset flex flex-col gap-10 pb-10">
          <header className="px-10 py-5 border-b-[1px] flex justify-between items-center">
            <div
              className=" flex w-fit gap-4 items-center cursor-pointer"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => window.history.back()}
            >
              <Image
                src="/favicon/android-chrome-512x512.png"
                alt="logo"
                width={50}
                height={50}
              />
              <div className="flex items-center">
                <motion.div
                  animate={{ x: isHovered ? -5 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <ChevronLeft />
                </motion.div>
                <span className="text-3xl">Quay lại</span>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <PublishedDialog blog={blog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => console.log(content)}
                    className="text-2xl"
                    disabled={!isSaved}
                  >
                    Xuất bản
                  </Button>
                </DialogTrigger>
              </PublishedDialog>
            </div>
          </header>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề"
            className="text-4xl font-bold p-5 w-full !outline-none !border-none focus-visible:ring-transparent px-10"
          />

          <div className="border-[1px] mx-10 shadow-lg">
            <TextEditor
              content={content}
              isSaving={isSaving}
              readOnly={false}
              setContent={setContent}
              setIsSaved={setIsSaved}
            />
          </div>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
};

export default NewBlog;
