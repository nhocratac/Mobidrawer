import { Button } from "@/components/ui/button";
import path from "@/utils/path";
import Image from "next/image";
import Link from "next/link";

export default function NotFoundBoard() {
    return (
        <div className="flex items-center justify-center bg-black w-screen h-screen">
            <div className="text-center flex flex-col gap-3 text-white">
                <p className="text-9xl font-bold">404-error</p>
                <p className="text-6xl font-semibold">
                    Board Not Found
                </p>
                <p className="text-2xl">
                    Bảng vẽ bạn đang tìm kiếm hiện không thấy. Vui lòng kiểm tra lại giúp mobidrawer nhé.
                </p>
                <Link href={path.user.dashboard}>
                    <Button size={'lg'} variant={'link'}>
                        <p className="text-3xl">Trở về trang chủ</p>
                    </Button>
                </Link>
            </div>
            <Image
                height={560}
                width={628}
                src={"https://res.cloudinary.com/dk922duea/image/upload/v1747066694/Group_1_ap7mv3.png"}
                alt="not found image"
            />
        </div>
    )
}
