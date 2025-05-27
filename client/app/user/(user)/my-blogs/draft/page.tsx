"use client";

import blogAPIs from "@/api/blogAPI";
import ShortBlog from "@/components/Blog/ShortBlog";
import Pageable from "@/components/Pageable";
import { Skeleton } from "@/components/ui/skeleton";
import useTokenStore from "@/lib/Zustand/tokenStore";
import React, { useEffect, useState } from "react";

const DraftBlog = () => {
  const [draftBlogs, setDraftBlogs] = useState<Pageable<Blog>>();
  const { user } = useTokenStore();
  const [refresh, setRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchDraftBlogs = async () => {
      if (!user) {
        return null;
      }
      try {
        setIsLoading(true);
        const blogs: Pageable<Blog> =
          await blogAPIs.getBlogsByUserIdAndIsPublished(user?.id, false, page);

        setDraftBlogs(blogs);
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDraftBlogs();
  }, [refresh, page, user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-end text-xl">{draftBlogs?.content.length}</p>
      </div>

      {draftBlogs?.content && draftBlogs?.content.length > 0 ? (
        <>
          {isLoading ? (
            <div className="space-y-5">
              <Skeleton className="w-full h-[100px]" />
              <Skeleton className="w-full h-[100px]" />
              <Skeleton className="w-full h-[100px]" />
            </div>
          ) : (
            <>
              {draftBlogs?.content.map((blog) => (
                <ShortBlog blog={blog} setRefresh={setRefresh} key={blog.id} />
              ))}
            </>
          )}
          {draftBlogs.totalPages > 1 && (
            <Pageable
              page={page}
              setPage={setPage}
              totalPages={draftBlogs.totalPages}
            />
          )}
        </>
      ) : (
        <p className="text-2xl">Chưa có blog nào</p>
      )}
    </div>
  );
};

export default DraftBlog;
