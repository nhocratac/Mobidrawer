'use client'
import React from 'react'
import LandingNavbar from '../../Shared/Components/Header'
import Footer from '../../Shared/Components/Footer'
import LogoSlider from '../../LandingPage/Components/LogoSlider'
import SecurityHero from './Components/SecurityHero'
import DataProtection from './Components/DataProtection'
export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
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
