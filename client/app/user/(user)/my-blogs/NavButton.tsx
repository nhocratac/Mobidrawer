"use client";

import blogAPIs from "@/api/blogAPI";
import { Button } from "@/components/ui/button";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { PencilLine } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

const NavButton = () => {
  const path = usePathname();
  const rotuer = useRouter();

  return (
    <div className="flex items-center justify-between border-b-2 py-5">
      <div>
        <Button
          className={`text-2xl ${
            path.includes("draft") && "text-yellow-500 hover:text-yellow-400"
          }`}
          variant={"ghost"}
          onClick={() => rotuer.push("/user/my-blogs/draft")}
        >
          Bản nháp
        </Button>
        <Button
          className={`text-2xl ${
            path.includes("published") &&
            "text-yellow-500 hover:text-yellow-400"
          }`}
          variant={"ghost"}
          onClick={() => rotuer.push("/user/my-blogs/published")}
        >
          Đã xuất bản
        </Button>
      </div>

      <div>
        <Button
          className="text-xl"
          variant={"outline"}
          onClick={async () => {
            try {
                const newBlog = await blogAPIs.createBlog({
                    title: "",
                    content: "",
                    isPublished: false,
                    thumbnail: "",
                    owner: useTokenStore.getState().user?.id,
                })

                rotuer.push(`/new-blog/${newBlog.id}`);
            } catch (error) {
              console.log(error);
            }
          }}
        >
          <PencilLine size={18} /> Viết bài mới
        </Button>
      </div>
    </div>
  );
};

export default NavButton;
