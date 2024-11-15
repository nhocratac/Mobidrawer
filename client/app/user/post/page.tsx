import CalendarComponent from '@/components/Calender/CalendarComponent'
import PostList from '@/components/Post/PostList'
import React from 'react'

function PostPage() {
    return (
        <div className='flex-1 flex gap-4 '>
            <div className=' w-4/5 flex flex-col gap-8 p-16 items-center border border-gray-300'>
                <PostList />
            </div>
            <div className='bg-slate-100 w-1/5'>
                <CalendarComponent month='11' year={2024} />
            </div>
        </div>
    )
}

export default PostPage