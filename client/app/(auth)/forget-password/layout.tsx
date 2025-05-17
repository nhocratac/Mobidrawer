import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
}

export default function ForgetPasswordLayout({ children }: LayoutProps) {
    return (
        <main className="flex flex-grow justify-center items-center bg-gray-50 p-4 -mt-16">
            <div
                className="w-[95%] md:w-[80%] lg:w-[60%] min-w-[300px] max-w-2xl bg-white px-4 sm:px-8 md:px-12 py-6 sm:py-8 md:py-12 border border-gray-200 rounded-xl shadow-md"
                style={{ border: '1px solid #444749' }}
            >
                {children}
            </div>
        </main>
    );
}