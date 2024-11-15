import { Star } from "lucide-react";
import { FunctionComponent } from "react";
export interface ItemProps {
    Image: FunctionComponent<any>;
    onwer: {
      name: string;
      logo: FunctionComponent<any>;
    };
    name: string;
    info: {
      description: string;
      price: number;
      rating: number;
    }
  }
const StarRating = ({ rating }: { rating: number }) => {
    const stars = [];
    for (let i = 0; i < Math.floor(rating); i++) {
        stars.push(<Star key={i}  strokeWidth={0} size={18} fill="yellow"/>);
    }
    for(let i = Math.floor(rating); i < 5; i++) {
        stars.push(<Star key={i}  strokeWidth={0} size={18} fill="gray"/>);
    }
    return (
        <div className="flex gap-2">
            {stars}
        </div>
    )
}
  
const LiItem = ({ Image, onwer, name,info }: ItemProps) => {
    return (
        <li className="flex flex-col gap-2  group ">
            <div className="max-w-[265px] max-h-[200px]  relative">
                {<Image className="rounded-[12px] " />}
                <div className="absolute text-white   opacity-0  group-hover:opacity-100 top-0 left-0 w-full h-full   p-4 ">
                    <p className="relative font-bold text-4xl z-10">{name}</p>
                    <p className="relative z-10 flex gap-4 items-center">
                        <onwer.logo height={24} width={24} />
                        <span className="font-normal text-2xl">{onwer.name}</span>
                    </p>
                    <p className="relative text-xl z-10 ">Description: {info.description}</p>
                    <p className="relative text-xl z-10 ">Rating: <StarRating rating={info.rating} /></p>
                    <div className="absolute w-full h-full top-0 left-0 p-4 bg-black rounded-[12px] shadow-lg  opacity-30  transition-opacity duration-300"></div>
                </div>
            </div>
            <div className='flex items-center gap-x-7 px-6'>
                <onwer.logo height={24} witdh={24} />
                <p className="font-normal  text-xl">{onwer.name}</p>
            </div>
            <div className="px-6 flex justify-between ">
                <span className="font-bold text-2xl">{name}</span>
                <button type="button" className="bg-blue-500 text-white font-bold rounded-[12px] px-4 py-2">Use</button>
            </div>
        </li>
    )
}

export default LiItem