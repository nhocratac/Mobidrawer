'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import IntegrationHero from '@/app/(MobiDrawerPages)/(Products)/Integration/Components/IntegrationHero'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import IntegrationTools from '@/app/(MobiDrawerPages)/(Products)/Integration/Components/IntegrationTools'

export default function Layout() {
    return (
        <div>
            <LandingNavbar />
            <div className="w-[90%] md:w-[85%] lg:max-w-[calc(100%-100px)] mx-auto px-4 md:px-6">
                <div className='relative z-20'>
                    <IntegrationHero />
                </div>
            </div>
            <div className="w-[90%] md:w-[85%] lg:max-w-[calc(100%-250px)] mx-auto px-4 md:px-6">
                <div className='relative z-20'>
                    <LogoSlider />
                    <IntegrationTools />
                </div>
            </div>
            <Footer />
        </div>
    )
}
