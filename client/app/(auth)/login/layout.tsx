
import { login } from '@/utils/metadata';
import { Metadata } from 'next';
import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
}

export const metadata : Metadata = {
    title : login.title,
    description : login.description,
    keywords : login.keywords
}

export default function LoginLayout({ children }: LayoutProps) {
    return (
        <main className="flex flex-grow justify-center items-center bg-gray-50">
            <div
                className="w-full max-w-lg bg-white px-[48px] py-[48px] border border-gray-200 rounded-xl shadow-md min-h-[600px] min-w-[524px]"
                style={{ border: '1px solid #444749' }}
            >
                {children}
            </div>
        </main>
    );
}
