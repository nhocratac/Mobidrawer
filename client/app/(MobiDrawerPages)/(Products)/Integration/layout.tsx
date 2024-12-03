'use client'
import React from 'react'
import LandingNavbar from '../../Shared/Components/Header'
import Footer from '../../Shared/Components/Footer'
import IntegrationHero from './Components/IntegrationHero'
import LogoSlider from '../../LandingPage/Components/LogoSlider'
import IntegrationTools from './Components/IntegrationTools'
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
