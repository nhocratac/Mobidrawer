

import HeaderAuth from "@/app/(auth)/HeaderAuth";

interface layoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: layoutProps) {
    return (
        <div className="flex flex-col ">
            <HeaderAuth />
            <div className='flex  justify-center items-center bg-gray-50' style={{ marginTop: '96px', height: 'calc(100vh - 96px)' }}>
                {children}
            </div>
        </div>
    );
}


