import { Button } from "@/components/ui/button";


interface BoardThumbnailProps {
    Thumbnail: React.ElementType;
    title: string;
    size: 'small' | 'medium' | 'large';
    onClick?: () => void;
    [key: string]: any;
}


export default function BoardThumbnail({ Thumbnail, title, size,onClick ,...props }: BoardThumbnailProps) {
    return (
        <div {...props} className="flex flex-col gap-4  hover:cursor-pointer" >
            <div className="h-full w-full" onClick={onClick}> 
                <div className=" h-4/5 border rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:brightness-110  ">
                    <Thumbnail />
                </div>
                <div className="text-[1.4rem]">{title}</div>
            </div>
        </div>
    );
}
