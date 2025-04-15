import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'

export default function Layout({children}: {children: React.ReactNode}) {
    return (
        <div className='flex flex-col min-h-screen'>
            <LandingNavbar />
            {children}
            <Footer />
        </div>
    )
}
