'use client'
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTemplateStore } from "@/lib/Zustand/store";
import { ItemProps } from "@/lib/Zustand/type.type";
import { Star } from "lucide-react";

const StarRating = ({ rating }: { rating: number }) => {
    const stars = [];
    for (let i = 0; i < Math.floor(rating); i++) {
        stars.push(<Star key={i} strokeWidth={0} size={18} fill="yellow" />);
    }
    for (let i = Math.floor(rating); i < 5; i++) {
        stars.push(<Star key={i} strokeWidth={0} size={18} fill="gray" />);
    }
    return (
        <div className="flex gap-2">
            {stars}
        </div>
    )
}

const LiItem = ({ ImageThumnail, owner, name, info, id }: ItemProps) => {
    const { toast } = useToast()

    const addNewTemplate = useTemplateStore((state) => state.addTemplate)
    const handleAdd = () => {
        toast({
            title: "Thành công",
            description: "Bạn đã thêm mẫu thành công",
        })
        const currBoard: ItemProps = {
            ImageThumnail,
            owner,
            name,
            info,
            id
        }

        addNewTemplate(currBoard)
    }
    return (
        <li className="flex flex-col gap-2 border-b ">
            <div className="max-w-[265px] max-h-[200px]  group relative">
                {ImageThumnail && <img src={ImageThumnail} alt={`template-${name}`} className="rounded-[12px] " />}
                <div className="absolute text-white   opacity-0  group-hover:opacity-100 top-0 left-0 w-full h-full   p-4 ">
                    <p className="relative font-bold text-4xl z-10">{name}</p>
                    <p className="relative z-10 flex gap-4 items-center">
                        <img src={owner.logo} alt={`${owner.name} logo`} height={24} width={24} />

                        <span className="font-normal text-2xl">{owner.name}</span>
                    </p>
                    <p className="relative text-xl z-10 ">Mô tả: {info.description}</p>
                    <div className="relative text-xl z-10 "><span>Đánh giá:</span> <StarRating rating={info.rating} /></div>
                    <div className="absolute w-full h-full top-0 left-0 p-4 bg-black rounded-[12px] shadow-lg  opacity-30  transition-opacity duration-300"></div>
                </div>
            </div>
            <div className='flex items-center gap-x-7 px-6'>
                <img src={owner.logo} alt={`${owner.name} logo`} height={24} width={24} />
                <p className="font-normal  text-xl">{owner.name}</p>
            </div>
            <div className="px-6 flex justify-between ">
                <span className="font-bold text-2xl">{name}</span>
                <Button type="button" className="text-xl font-bold rounded-[12px] px-4 py-2" onClick={handleAdd}>Thêm</Button>
            </div>
        </li>
    )
}

export default LiItem