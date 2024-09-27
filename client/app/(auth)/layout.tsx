'use client';
import { Button } from '@/components/ui/button';
import path from '@/utils/path';
import Link from 'next/link';
import React from 'react';
import HamburgerMenu from '@/components/header/HamburgerMenu';
import { usePathname } from 'next/navigation';

interface layoutProps {
    children: React.ReactNode;
    [key: string]: any;
}

export default function AuthLayout({ children, ...props }: layoutProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-screen ">
            <header className='fixed top-0 left-0 right-0 z-50 lg:h-[96px] h-[54px] bg-white text-[black] border border-b-[#444749] lg:px-[24px] lg:py-[8px] flex justify-between items-center' {...props}>
                <div className='flex items-center place-content-around lg:leading-[64px] gap-4'>
                    <HamburgerMenu />
                    <Link href={path.home}>
                        <h1 className='mt-0 text-[3rem]'>
                            MOBIDRAWER
                        </h1>
                    </Link>
                    <span className=''>
                        free drawing app
                    </span>
                </div>
                <div className='flex gap-4 text-[2rem]'>
                    {pathname === path.login ? (
                        <Link href={path.register}>
                            <Button className='text-[2rem]'>Register</Button>
                        </Link>
                    ) : (
                        <Link href={path.login}>
                            <Button className='text-[2rem]'>Login</Button>
                        </Link>
                    )}
                </div>
            </header>
            <div className='flex flex-grow justify-center items-center bg-gray-50 pt-[90px]' style={{ marginTop: '96px', height: 'calc(100vh - 96px)' }}>
                {children}
            </div>
        </div>
    );
}


