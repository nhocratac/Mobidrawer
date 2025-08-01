"use client";

import React, { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipsis } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

const DropdownButton = ({
  isOwner,
  blogId,
}: {
  isOwner: boolean;
  blogId: string;
}) => {
  const [currentUrl, setCurrentUrl] = useState("");
  console.log("isOwner", isOwner);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    toast({
      title: "Sao chép liên kết thành công",
      description: "Bạn đã sao chép liên kết thành công",
    });
  };

  const shareOnFacebook = () => {
    const url = window.location.href;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const shareOnTwitter = () => {
    const url = window.location.href;
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const shareOnLinkedIn = () => {
    const url = window.location.href;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <Ellipsis size={20} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        {isOwner && (
          <DropdownMenuItem>
            <Link
              href={`/new-blog/${blogId}`}
              className="p-3 hover:bg-[#eaeaea] w-full cursor-pointer"
            >
              <span className="text-xl">Chỉnh sửa</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem>
          <div
            className="p-3 hover:bg-[#eaeaea] w-full cursor-pointer"
            onClick={handleCopyLink}
          >
            <span className="text-xl">Sao chép liên kết</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <div className="p-3 w-full">
            <span className="text-xl mb-2 block">Chia sẻ qua</span>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={shareOnFacebook}
                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full text-left"
              >
                Facebook
              </button>
              <button
                onClick={shareOnTwitter}
                className="p-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 w-full text-left"
              >
                Twitter
              </button>
              <button
                onClick={shareOnLinkedIn}
                className="p-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 w-full text-left"
              >
                LinkedIn
              </button>
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DropdownButton;
