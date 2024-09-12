'use client'

import { useSelectedLayoutSegment } from "next/navigation"

export default function layout({
    children,
    activeRecord,
    post,
}: {
    children: React.ReactNode,
    activeRecord: React.ReactNode,
    post: React.ReactNode,
}) {
    const loginUser = useSelectedLayoutSegment('post')
    console.log(loginUser, ' login user')
    return (
        <>
            {children}
            <div className="flex justify-around">
                {activeRecord}
                {post}
            </div>
        </>
    )
}