import SendRequestJoin from "@/app/user/board/[id]/sendRequestJoin";
import Image from "next/image";

export default function UnauthorizeBoard() {
    return (
        <div className="flex items-center justify-center bg-black w-screen h-screen">
            <div className="text-center flex flex-col gap-3 text-white">
                <p className="text-9xl font-bold">401-error</p>
                <p className="text-6xl font-semibold">
                    Unauthorize to access this board
                </p>
                <p className="text-2xl">
                    Bảng vẽ bạn đang tìm kiếm hiện không thể truy cập. Hãy liên hệ chủ sở hữu để truy cập.
                </p>
                <SendRequestJoin />
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
