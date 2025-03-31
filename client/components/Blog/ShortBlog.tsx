import { formatDate } from "@/lib/utils";
import { Ellipsis } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import blogAPIs from "@/api/blogAPI";
import { useToast } from "@/hooks/use-toast";

const ShortBlog = ({
  blog,
  setRefresh,
}: {
  blog: Blog;
  setRefresh: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [isOpend, setIsOpened] = useState(false);
  const optionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (optionRef.current && !optionRef.current.contains(e.target as Node)) {
      setIsOpened(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className="w-full border-2 rounded-xl p-5">
      <div ref={optionRef} className="flex justify-end relative">
        <Ellipsis
          size={20}
          className="cursor-pointer"
          onClick={() => setIsOpened(!isOpend)}
        />
        <AnimatePresence>
          {isOpend && (
            <motion.div
              animate={{
                opacity: 1,
                y: 0,
              }}
              initial={{
                opacity: 0,
                y: -10,
              }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.2, // Thời gian hiệu ứng
                ease: "easeOut",
              }}
              className="absolute z-10 top-10 right-3"
            >
              <div className="bg-white shadow-[0_0px_5px] shadow-slate-400 rounded-xl py-3 w-[100px] flex flex-col gap-3 ">
                <button
                  className="text-2xl px-3 py-2 hover:bg-[#e7e7e7] rounded-sm text-start"
                  onClick={() => router.push(`/new-blog/${blog.id}`)}
                >
                  Sửa
                </button>
                <button
                  className="text-2xl px-3 py-2 hover:bg-[#e7e7e7] rounded-sm text-start"
                  onClick={async () => {
                    if (blog.id) {
                      toast({
                        title: "Deleting...",
                      });
                      try {
                        await blogAPIs.removeBlog(blog.id);
                        setRefresh((prev) => !prev);
                        toast({
                          title: "Deleted successfully",
                        });
                      } catch (error) {
                        console.log(error);
                      }
                    }
                  }}
                >
                  Xóa
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-4 cursor-pointer" onClick={() => router.push(`/Blog/${blog.id}`)}>
        <p className="text-3xl font-bold">{blog.title}</p>
        <p className="text-xl">{blog.description}</p>

        <p className="text-xl">
          Sửa lần cuối: {formatDate(blog.updatedAt ?? "")}
        </p>
      </div>
    </div>
  );
};

export default ShortBlog;
