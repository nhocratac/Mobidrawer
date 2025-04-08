import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { formatDate, parseTokenInfo } from "@/lib/utils";
import { serializeSlateToHtml } from "@/utils/slateToHtml";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import { Descendant } from "slate";
import DropdownButton from "./DropdownButton";

const fetchBlogById = async (
  blogId: string
): Promise<(Blog & { owner: User }) | undefined> => {
  const res = await fetch(`http://localhost:8080/api/v1/blogs/${blogId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) return undefined;
  return await res.json();
};

const page = async ({ params }: { params: Promise<{ blogId: string }> }) => {
  const { blogId } = await params;
  const accessToken = cookies().get("accessToken")?.value;
  let isOwner = false;
  const blog = await fetchBlogById(blogId);

  if (!blog) {
    redirect("/404");
  }

  if (
    accessToken &&
    typeof blog.owner !== "string" &&
    blog.owner.id === parseTokenInfo(accessToken).id
  ) {
    isOwner = true;
  }

  const slateContent = JSON.parse(blog.content)
    .map((item: Descendant) => serializeSlateToHtml(item))
    .join("");

  return (
    <div className="flex flex-col items-center p-10">
      <div className="space-y-[50px] max-w-[1000px] px-5" style={{ wordBreak: "break-word"}}>
        <h1 className="text-5xl font-bold">{blog.title}</h1>

        <div className="profile-bar flex gap-5 items-center">
          <Avatar className="w-[50px] h-[50px]">
            <AvatarImage src={blog.owner.avatar} alt={blog.owner.firstName} />
            <AvatarFallback>{blog.owner.lastName}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-2xl font-medium">
              {blog.owner.firstName} {blog.owner.lastName}
            </h1>
            {blog.updatedAt && (
              <p className="text-lg text-gray-500">
                Cập nhật lần cuối: {formatDate(blog.updatedAt)}
              </p>
            )}
          </div>
          
          <DropdownButton isOwner={isOwner} />
        </div>

        {blog.content && (
          <div className="no-reset">
            <div
              dangerouslySetInnerHTML={{
                __html: slateContent,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default page;
