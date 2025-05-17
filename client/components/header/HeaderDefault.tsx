'use client'
import { Button } from '@/components/ui/button'
import path from '@/utils/path'
import Link from 'next/link'
import HamburgerMenu from '@/components/header/HamburgerMenu'
import useTokenStore from '@/lib/Zustand/tokenStore'
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"
import { Notification, getNotifications } from "@/api/notificationAPI"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'


interface HeaderDefaultProps {
  [key: string]: unknown
}

export default function HeaderDefault({
  ...props
}: HeaderDefaultProps) {
  const {token} = useTokenStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false) // Trạng thái mở thông báo

  useEffect(() => {
    if(token && isOpen) {
      fetchNotifications()
    }
  }, [token, isOpen])

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch(error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  return (
    <header className='lg:h-[64px] h-[54px] bg-white text-[black] border  border-[#e0e2e8] lg:px-[24px] lg:py-[8px]  flex justify-between items-center' {...props}>
      <div className='flex items-center place-content-around lg:leading-[64px]  gap-4 '>
        <HamburgerMenu />
        <Link href={path.landingPage}>
          <h1 className='mt-0 text-[3rem] shake-rotate'>
            MOBIDRAWER
          </h1>
        </Link>
        <span className=''>
          vẽ miễn phí
        </span>
      </div>
      <div className='flex gap-4 text-[2rem]'>
        {token ? (
          <>
            <Link href={path.post}>
              <p>Post</p>
            </Link>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger className="p-2 rounded-full hover:bg-gray-100">
                <div className='relative'>
                  <Bell className="h-6 w-6" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 mr-4 p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className='divide-y divide-gray-200'>
                      {notifications.map(notification => (
                        <div
                          key={notification.id}
                          className='p-3 hover:bg-gray-50 cursor-pointer'
                        >
                          <div className="flex justify-between">
                            <h4 className="font-medium">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {new Date(notification.updateAt).toLocaleString()}
                            </span>
                          </div>
                          <p className='text-sm text-gray-600 mt-1'>
                            {notification.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </>
        ) : (
          <>
            <Link href={path.login}>
              <Button className='text-[2rem]'>Đăng Nhập</Button>
            </Link>
            <Link href={path.register}>
              <Button className='text-[2rem]'>Đăng kí</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
