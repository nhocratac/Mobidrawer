import env from "@/utils/environment";





export const BoardThumnailImg = ({ src, alt, ...props }:
    {
        src: string,
        alt: string,
        [Key: string]: any
    }) => {
        return (
            <img src={src} alt={`${env.APP_NAME}-${alt}`} className="w-full h-full">
        </img>
    )
    
}

interface BoardThumbnailProps {
    Thumbnail: React.ElementType;
    title: string;
    size: 'small' | 'medium' | 'large';
    [key: string]: any;
}


export default function BoardThumbnail({ Thumbnail, title, size, ...props }: BoardThumbnailProps) {
    return (
        <div {...props} className="flex flex-col gap-4  hover:cursor-pointer" >
            <div className=" h-4/5 border rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:brightness-110  ">
                <Thumbnail  />
            </div>
            <div className="text-[1.4rem]">{title}</div>
        </div>
    );
}
