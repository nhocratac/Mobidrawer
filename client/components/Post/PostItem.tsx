'use client';
import ModalComment from "@/components/Comment/ModalComment";
import Reaction from "@/components/Reaction/Reaction";
import { Button } from "@/components/ui/button";
import { MessageCircle, Share2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export interface PostItemProps {
    id: string,
    owner: {
        name: string,
        avatar: string,
        role : string
    },
    image: string,
    text: {
        title: string,
        description: string,
    }
}

function PostItem({ owner, image, text }: PostItemProps) {
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
                        src={owner.avatar} />
                    <div>
                        <p className='font-medium text-3xl'>
                            {owner.name}
                        </p>
                        <p className='text-xl font-light'>
                            {owner.role} <span className='font-medium'>{' 3 giờ trước'}</span>
                        </p>
                    </div>
                </div>
                <div className='flex flex-col items-end'>
                    <div className='cursor-pointer'>x</div>
                    <div className='cursor-pointer'>...</div>
                </div>
            </div>
            <div className='p-4'>
                <p className='text-3xl font-medium'>{text.title}</p>
                <p className='text-2xl font-normal'>{text.description}</p>
            </div>
            <div className='p-4 flex justify-center'>
                <div className='max-w-full overflow-hidden'>
                    <Image
                        className='w-full max-h-[500px] object-contain'
                        src={image}
                        width={350}
                        height={350}
                        alt='post image'
                    />
                </div>
            </div>
            <div className="p-4 flex justify-around items-center gap-2 ">
                <Button className='text-2xl rounded-2xl px-6 py-6 flex-1' variant={'outline'} onClick={toggleLike}>
                    <Reaction />
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