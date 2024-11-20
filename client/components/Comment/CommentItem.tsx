import Reaction from "@/components/Reaction/Reaction"
import Image from "next/image"


const CommentItem = () => {

    return (
        <div className="flex gap-4">
            <div>
                <Image
                    height={54}
                    width={54}
                    alt='avatar'
                    className='rounded-full'
                    src='/assets/images/vietthang.jpg' />
            </div>
            <div className=" py-4 px-8 rounded-2xl flex flex-col text-2xl gap-2 bg-neutral-200">
                <h5 className="font-bold">Nguyễn Văn A</h5>
                <p>Awesome!. Sao bạn không làm thêm nội dung này</p>
                <Reaction />
            </div>
        </div>
    )
}

export default CommentItem