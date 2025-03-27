'use client'
import React from 'react'
import LandingNavbar from '../../Shared/Components/Header'
import Footer from '../../Shared/Components/Footer'
import LogoSlider from '../../LandingPage/Components/LogoSlider'
import TeamHero from './Components/TeamHero'
import TeamPlan from './Components/TeamPlan'
import TeamCollaborate from './Components/TeamCollaborate'
import TeamTool from './Components/TeamTool'
export default function Layout() {
    return (
        <div className="min-h-screen w-full overflow-x-hidden">
            <LandingNavbar />
            <div className="w-full px-4 sm:px-6 md:px-8 lg:max-w-[calc(100%-250px)] lg:mx-auto">
                <div className='relative z-20'>
                    <TeamHero />
                    <LogoSlider />
                    <TeamPlan />
                    <TeamCollaborate />
                    <TeamTool />
                </div>
            </div>
            <Footer />
        </div>
    )
}
