'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import UseCaseHero from '@/app/(MobiDrawerPages)/(Solutions)/UseCase/Components/UseCaseHero'
import Brainstorming from '@/app/(MobiDrawerPages)/(Solutions)/UseCase/Components/Brainstorming'
import DesignThinking from '@/app/(MobiDrawerPages)/(Solutions)/UseCase/Components/DesignThinking'
import Diagram from '@/app/(MobiDrawerPages)/(Solutions)/UseCase/Components/Diagram'
export default function Layout() {
    return (
        <div>
            <LandingNavbar />
            <div className="max-w-[calc(100%-250px)] mx-auto">
                <div className='relative z-20 '>
                    <UseCaseHero />
                    <LogoSlider />
                    <Brainstorming />
                    <DesignThinking />
                    <Diagram />
                </div>
            </div>
            <Footer />
        </div>
    )
}
