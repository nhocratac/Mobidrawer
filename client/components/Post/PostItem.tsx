'use client';
import ModalComment from "@/components/Comment/ModalComment";
import Reaction from "@/components/Reaction/Reaction";
import { Button } from "@/components/ui/button"
import { MessageCircle, Share2, ThumbsUp } from "lucide-react"
import { useState } from "react"
import Image from 'next/image'

function PostItem() {
    const [liked, setLiked] = useState(false)
    const [isCommenting, setIsCommenting] = useState(false)
    const [isSharing, setIsSharing] = useState(false)

    const toggleLike = () => {
        setLiked(!liked)
    }

    const handleToggleModal = () => {
        setIsCommenting(!isCommenting);
    };

    return (
        <div className='min-h-48 w-full p-8 border border-gray-200 rounded-xl shadow-lg'>
            <div className='p-4 flex justify-between items-center'>
                <div className='flex gap-4'>
                    <Image
                        className='w-16 h-16 rounded-full'
                        width={64}
                        height={64}
                        alt='avatar'
                        src = '/assets/images/vietthang.jpg' />
                    <div>
                        <p className='font-medium text-3xl'>
                            Nguyễn Việt Thắng
                        </p>
                        <p className='text-xl font-light'>
                            Developer <span className='font-medium'>{' 3 giờ trước'}</span>
                        </p>
                    </div>
                </div>
                <div className='flex flex-col items-end'>
                    <div className='cursor-pointer'>x</div>
                    <div className='cursor-pointer'>...</div>
                </div>
            </div>
            <div className='p-4'>
                <p className='text-3xl font-medium'>{'Chào mừng bạn đến với team'}</p>
                <p className='text-2xl font-normal'>{'Bạn đã tham gia team với vai trò Developer. Chúng tôi rất vui khi gặp bạn'}</p>
            </div>
            <div className='p-4 flex justify-center'>
                <img
                    className='w-[500px] h-[500px]' // Thay đổi kích thước ở đây
                    src='https://images.ctfassets.net/w6r2i5d8q73s/eukCg0rlZwALnsTen1Klb/eea90c6d6033a86287277af3e30585b8/agile_retrospective_product-image_02_EN_standard_3_2.png?fm=webp&q=75'
                    alt='team'
                />
            </div>
            <div className="p-4 flex justify-around items-center gap-2 ">
                <Button className='text-2xl rounded-2xl px-6 py-6 flex-1' variant={'outline'} onClick={toggleLike}>
                    <Reaction/>
                </Button>
                <Button className='text-2xl rounded-2xl px-6 py-6 flex-1' variant={'outline'} onClick={handleToggleModal}>
                    <MessageCircle
                        strokeWidth={2}
                        color={isCommenting ? 'black' : 'black'}
                        fill={isCommenting ? 'green' : 'none'}
                    />{'Bình luận'}
                </Button>
                <Button className='text-2xl rounded-2xl px-6 py-6 flex-1' variant={'outline'} onClick={() => setIsSharing(!isSharing)}>
                    <Share2
                        strokeWidth={2}
                        color={isSharing ? 'black' : 'black'}
                        fill={isSharing ? 'purple' : 'none'}
                    />{'Chia sẻ'}
                </Button>

                {isCommenting && <ModalComment handleToggleModal={handleToggleModal} />}
            </div>
        </div>
    )
}

export default PostItem