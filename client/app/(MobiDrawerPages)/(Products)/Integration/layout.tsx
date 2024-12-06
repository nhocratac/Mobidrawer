'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import IntegrationHero from '@/app/(MobiDrawerPages)/(Products)/Integration/Components/IntegrationHero'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import IntegrationTools from '@/app/(MobiDrawerPages)/(Products)/Integration/Components/IntegrationTools'
export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div>
            <LandingNavbar />
            <div className="max-w-[calc(100%-100px)] mx-auto">
                <div className='relative z-20'>
                    <IntegrationHero />
                </div>
            </div>
            <div className="max-w-[calc(100%-250px)] mx-auto">
                <div className='relative z-20'>
                    <LogoSlider />
                    <IntegrationTools />
                </div>
            </div>
            <Footer />
        </div>
    )
}
