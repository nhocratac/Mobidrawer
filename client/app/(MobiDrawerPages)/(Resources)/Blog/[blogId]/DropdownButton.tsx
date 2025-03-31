"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipsis } from "lucide-react";

const DropdownButton = ({ isOwner }: { isOwner: boolean }) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Đã sao chép liên kết");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          <Ellipsis size={20} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[150px]">
        {isOwner && (
          <DropdownMenuItem>
            <div className="p-3 hover:bg-[#eaeaea] w-full cursor-pointer">
              <span className="text-xl">Chỉnh sửa</span>
            </div>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DropdownButton;
