'use client'
import { svgs } from "@/assets";
import NavSide from "@/components/SideBar/NavSide";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Input } from "@/components/ui/input"
import useTokenStore from "@/lib/Zustand/tokenStore";
import path from "@/utils/path";
import { EllipsisVertical, Search } from "lucide-react"
import Link from "next/link";


export default function SideBar() {
    const {user} = useTokenStore()
    return (
        <div className="text-3xl w-full h-full flex flex-col  border border-gray-300  ">
            <div className="h-[48px] border w-full flex items-center justify-between">
                <Link href={path.user.profile}>
                    <div className="ml-4">
                        <Avatar className="w-[32px] h-[32px]">
                            <AvatarImage src={ user?.avatarUrl ||"https://github.com/shadcn.png"} />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                    </div>
                </Link>
                <div className="mr-4">
                    <EllipsisVertical />
                </div>
            </div>
            <div className="relative mx-auto w-[90%] p-0">
                <Search className="absolute left-5 top-1/2 h-4 w-4 text-gray-500 translate-y-[-50%]" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm..."
                    className="pl-12 py-0 m-0 h-[40px] border border-gray-300 rounded-lg my-4"
                />
            </div>
            <div>
                <NavSide />
            </div>
            <div className="mt-[200px] relative mx-auto">
                <svgs.Rocket width={100} height={100} className="animate-fly " />
            </div>
        </div>
    )
}
