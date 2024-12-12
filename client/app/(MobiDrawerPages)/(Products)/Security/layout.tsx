'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import SecurityHero from '@/app/(MobiDrawerPages)/(Products)/Security/Components/SecurityHero'
import DataProtection from '@/app/(MobiDrawerPages)/(Products)/Security/Components/DataProtection'
export default function Layout() {
    return (
        <div>
            <LandingNavbar />
            <div className="max-w-[calc(100%-250px)] mx-auto">
                <div className='relative z-20'>
                    <SecurityHero />
                    <LogoSlider />
                    <DataProtection />
                </div>
            </div>
            <Footer />
        </div>
    )
}
