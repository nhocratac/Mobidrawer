import { Input } from "@/components/ui/input"
import { Search } from 'lucide-react'
import Image from "next/image"
import help from "@/assets/HelpCenterImages/help.png"

export default function HelpCenterHero() {
    return (
        <div className="relative w-full min-h-[350px]">
            <div className="absolute inset-0">
                <Image
                    src={help}
                    alt="help"
                    layout="fill"
                    objectFit="cover"
                    quality={100}
                    priority
                />
            </div>
            <div className="flex flex-col items-center text-center justify-center absolute inset-0">
                <h1 className="mb-8 text-center text-4xl font-bold text-white sm:text-5xl">
                    Chúng tôi ở đây để giúp bạn
                </h1>
                <div className="relative w-full max-w-2xl mx-auto px-4">
                    <Input
                        type="search"
                        placeholder="Hãy tìm kiếm vấn đề của bạn"
                        className="h-12 pl-12 text-lg rounded-full"
                    />
                    <Search className="absolute mx-4 left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black" />
                </div>
            </div>
        </div>
    )
}

