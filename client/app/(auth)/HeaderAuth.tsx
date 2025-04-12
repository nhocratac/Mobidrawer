'use client';
import React from 'react'
import { Button } from '@/components/ui/button';
import path from '@/utils/path';
import Link from 'next/link';
import HamburgerMenu from '@/components/header/HamburgerMenu';
import { usePathname } from 'next/navigation';


function HeaderAuth() {
    const pathname = usePathname();
    return (
        <header className=' top-0 left-0 right-0 z-50 lg:h-[96px] h-[54px] bg-white text-[black] border border-b-[#444749] lg:px-[24px] lg:py-[8px] flex justify-between items-center' >
            <div className='flex items-center place-content-around lg:leading-[64px] gap-4'>
                <HamburgerMenu />
                <Link href={path.user.dashboard}>
                    <h1 className='mt-0 text-[3rem]'>
                        MOBIDRAWER
                    </h1>
                </Link>
                <span className=''>
                    vẽ miễn phí
                </span>
            </div>
            <div className='flex gap-4 text-[2rem]'>
                {pathname === path.login ? (
                    <Link href={path.register}>
                        <Button className='text-[2rem]'>Đăng kí</Button>
                    </Link>
                ) : (
                    <Link href={path.login}>
                        <Button className='text-[2rem]'>Đăng Nhập</Button>
                    </Link>
                )}
            </div>
        </header>
    )
}

export default HeaderAuth