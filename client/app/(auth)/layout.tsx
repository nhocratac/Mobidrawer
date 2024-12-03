'use client';

import HeaderAuth from "@/app/(auth)/HeaderAuth";


interface layoutProps {
    children: React.ReactNode;
    [key: string]: any;
}

export default function AuthLayout({ children, ...props }: layoutProps) {
    return (
        <div className="flex flex-col min-h-screen ">
            <HeaderAuth />
            <div className='flex flex-grow justify-center items-center bg-gray-50 pt-[90px]' style={{ marginTop: '96px', height: 'calc(100vh - 96px)' }}>
                {children}
            </div>
        </div>
    );
}


