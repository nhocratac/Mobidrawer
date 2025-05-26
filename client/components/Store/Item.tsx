'use client'
import userApi from "@/api/userApi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Template } from "@/lib/Zustand/templateStore";
import { Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const StarRating = ({ rating }: { rating: number }) => {
    const stars = [];
    for (let i = 0; i < Math.floor(rating); i++) {
        stars.push(<Star key={i} strokeWidth={0} size={14} fill="yellow" />);
    }
    for (let i = Math.floor(rating); i < 5; i++) {
        stars.push(<Star key={i} strokeWidth={0} size={14} fill="gray" />);
    }
    return (
        <div className="flex gap-1">
            {stars}
        </div>
    )
}

const UserLiItem = ({ owner }: { owner: string }) => {
    const [ownerDetail, setOwner] = useState({
        logo: '',
        name: ''
    });
    userApi.getUserDetailById(owner)
        .then((res) => {
            setOwner({
                logo: res.avatarUrl || '/default-logo.png', // fallback logo if none provided
                name: res.firstName + res.lastName || 'Unknown User'
            });
        })
        .catch((err) => {
            console.error("Error fetching user details:", err);
        });

    return (
        <>
            <Image src={ownerDetail.logo} alt={`${ownerDetail.name} logo`} height={16} width={16} />
            <span className="font-normal text-sm sm:text-base md:text-lg">{ownerDetail.name}</span>
        </>
    )
}

const LiItem = ({
    previewImageUrl,
    owner,
    title,
    description,
}: Template) => {
    const { toast } = useToast()

    const handleAdd = () => {
        toast({
            title: "Thành công",
            description: "Bạn đã thêm mẫu thành công",
        })
    }
    return (
        <li className="flex flex-col gap-1 border-b pb-2 mx-auto w-full max-w-[280px]">
            <div className="w-full h-auto aspect-[4/3] group relative">
                {previewImageUrl && <img src={previewImageUrl} alt={`template-${name}`} className="w-full h-full object-cover rounded-[8px]" />}
                <div className="absolute text-white opacity-0 group-hover:opacity-100 top-0 left-0 w-full h-full p-1 sm:p-2">
                    <p className="relative font-bold text-base sm:text-lg md:text-xl lg:text-2xl z-10">{title}</p>
                    <p className="relative z-10 flex gap-1 sm:gap-2 items-center">
                        <UserLiItem owner={owner} />
                    </p>
                    <p className="relative text-xs sm:text-sm md:text-base z-10 line-clamp-2">Mô tả: {description}</p>
                    <div className="relative text-xs sm:text-sm md:text-base z-10"><span>Đánh giá:</span> <StarRating rating={4.5} /></div>
                    <div className="absolute w-full h-full top-0 left-0 p-1 sm:p-2 bg-black rounded-[8px] shadow-lg opacity-30 transition-opacity duration-300"></div>
                </div>
            </div>
            <div className='flex items-center gap-x-2 sm:gap-x-4 px-1 sm:px-3'>
                <UserLiItem owner={owner} />
            </div>
            <div className="px-1 sm:px-3 flex justify-between items-center">
                <span className="font-bold text-sm sm:text-base md:text-lg">{title}</span>
                <Button type="button" className="text-xs sm:text-sm md:text-base font-bold rounded-[8px] px-1 py-0.5 sm:px-2 sm:py-1" onClick={handleAdd}>Thêm</Button>
            </div>
        </li>
    )
}

export default LiItem