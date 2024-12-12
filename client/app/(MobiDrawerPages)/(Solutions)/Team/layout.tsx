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
        <div>
            <LandingNavbar />
            <div className="max-w-[calc(100%-250px)] mx-auto">
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
