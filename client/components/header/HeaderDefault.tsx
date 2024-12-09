'use client'
import { Button } from '@/components/ui/button'
import path from '@/utils/path'
import Link from 'next/link'
import React from 'react'
import HamburgerMenu from '@/components/header/HamburgerMenu'


interface HeaderDefaultProps {
  role?: string
  [key: string]: any
}

export default function HeaderDefault({
  role,
  ...props
}: HeaderDefaultProps) {
  const [isLogin, setIsLogin] = React.useState(false)


  return (
    <header className='lg:h-[64px] h-[54px] bg-white text-[black] border  border-[#e0e2e8] lg:px-[24px] lg:py-[8px]  flex justify-between items-center' {...props}>
      <div className='flex items-center place-content-around lg:leading-[64px]  gap-4 '>
        <HamburgerMenu/>
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
        {isLogin ? (
          <Link href={path.post}>
            <p>Post</p>
          </Link>
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
