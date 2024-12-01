'use client'
import PostItem, { PostItemProps } from '@/components/Post/PostItem'
import { Skeleton } from '@/components/ui/skeleton'
import { postImage, postOwner, postText } from '@/mocks'
import { useEffect, useState, useRef } from 'react'

export function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3 items-center">
      <Skeleton className="h-[375px] w-[400px] rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[400px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>
    </div>
  )
}

function PostList() {
  const [posts, setPosts] = useState<PostItemProps[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true) // Cờ kiểm tra còn bài viết không
  const listRef = useRef<HTMLDivElement | null>(null) // ref cho phần tử chứa danh sách bài viết


  // Mô phỏng dữ liệu ban đầu
  useEffect(() => {
    setPosts([
      {
        id: (postImage.length + 1).toString(),
        owner: postOwner[Math.floor(Math.random() * postOwner.length)],
        image: postImage[Math.floor(Math.random() * postImage.length)],
        text: postText[Math.floor(Math.random() * postText.length)],
      },
    ])
  }, [])

  // Hàm tải thêm bài viết
  const loadMorePosts = () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)

    // Mô phỏng API call bằng setTimeout
    setTimeout(() => {
      const newPosts = Array(2)
        .fill(null)
        .map((_, index) => ({
          id: `${posts.length + index + 1}`,
          owner: postOwner[Math.floor(Math.random() * postOwner.length)],
          image: postImage[Math.floor(Math.random() * postImage.length)],
          text: postText[Math.floor(Math.random() * postText.length)],
        }))

      setPosts(prev => [...prev, ...newPosts])
      setIsLoading(false)

      if (posts.length + newPosts.length >= 50) {
        setHasMore(false)
      }
    }, 3000)
  }

  // Sự kiện khi cuộn tới cuối danh sách
  useEffect(() => {
    const handleScroll = () => {
      if (
        listRef.current &&
        listRef.current.scrollHeight - listRef.current.scrollTop <= listRef.current.clientHeight + 100
      ) {
        loadMorePosts()
      }
    }

    if (listRef.current) {
      listRef.current.addEventListener('scroll', handleScroll)
    }

    return () => {
      if (listRef.current) {
        listRef.current.removeEventListener('scroll', handleScroll)
      }
    }
  }, [posts, isLoading, hasMore])

  return (
    <div ref={listRef} className="flex-col gap-8 p-16 items-center overflow-y-auto flex-1 max-h-[760px]">
      {posts.length === 0 ? (
        <p>Không có bài viết nào</p>
      ) : (
        posts.map(post => <PostItem key={post.id} {...post} />)
      )}
      {isLoading &&
        <div className='w-full flex justify-center mt-6 '>
          <SkeletonCard />
        </div>
      }

      {!hasMore && <p>Đã tải hết bài viết</p>}
    </div>
  )
}

export default PostList
