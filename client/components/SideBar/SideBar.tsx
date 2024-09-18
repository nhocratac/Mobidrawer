import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"


export default function SideBar() {
    return (
        <div className="text-3xl w-full">
            <div className="h-[48px] border w-full flex items-center justify-between">
                <div className="ml-4">
                    <Avatar className="w-[32px] h-[32px]">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                </div>
                <div className="mr-4">
                    more
                </div>
            </div>
            <div className="mx-auto w-[90%]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8  h-[40px] border border-gray-300 rounded-lg my-4"
                />
            </div>
            <div>
                <ul className='space-y-4 text-left'>
                    <li><a href="#home" className='block hover:bg-gray-200 p-4 rounded'>Home</a></li>
                    <li><a href="#about" className='block hover:bg-gray-200 p-4 rounded'>About</a></li>
                    <li><a href="#services" className='block hover:bg-gray-200 p-4 rounded'>Services</a></li>
                    <li><a href="#contact" className='block hover:bg-gray-200 p-4 rounded'>Contact</a></li>
                </ul>
            </div>
            <div>
                more
            </div>
        </div>
    )
}
