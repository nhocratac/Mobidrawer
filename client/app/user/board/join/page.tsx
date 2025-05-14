'use client'

import BoardAPI from "@/api/BoardAPI";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";

function JoinBoardContent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const email = decodeURIComponent(searchParams.get("email") || "");
    const boardId = searchParams.get("boardId");

    const handleAddUser = () => {
        if (!email || !boardId) {
            console.error("Invalid email or board ID");
            return;
        }

        BoardAPI.addPersonToBoard(boardId, {
            email,
            role: "EDITOR"
        }).then(() => {
            toast({
                title: "Thành công",
                description: `Thêm người dùng ${email} thành công`,
                variant: "default",
            });
        }).catch((err) => {
            toast({
                title: "Thất bại",
                description: `Thêm người dùng ${email} thất bại. ${err.response?.data?.message || "Lỗi không xác định"}`,
                variant: "destructive",
            });
        });
    };

    return (
        <div className="flex-1 flex flex-col items-center">
            <div className="font-extrabold text-6xl text-white">
                Thêm người dùng vào bảng
            </div>
            <div className="text-xl text-white mt-6">
                thêm người người dùng này vào bảng của bạn
            </div>
            <Button variant={'default'} className="text-2xl " onClick={handleAddUser}>
                Thêm
            </Button>
        </div>
    );
}

export default function JoinBoardPage() {
    return (
        <div className="h-screen bg-green-500 w-screen flex flex-col lg:flex-row justify-center items-center">
            <Suspense fallback={<div className="text-white text-xl">Đang tải...</div>}>
                <JoinBoardContent />
            </Suspense>
            <Image
                src="https://res.cloudinary.com/dk922duea/image/upload/v1747119098/women_with_tab_1_fnuxb9.png"
                height={553}
                width={793}
                alt="women touching tablet"
                className="bg-gradient-to-tr from-[#CFED38] to-[#F4E181] h-full w-full"
            />
        </div>  
    );
}