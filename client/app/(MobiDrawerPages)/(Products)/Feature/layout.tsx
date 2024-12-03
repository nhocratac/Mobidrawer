'use client'

import React from 'react'
import LandingNavbar from '../../Shared/Components/Header'
import FeatureHero from './Components/FeatureHero'
import Footer from '../../Shared/Components/Footer'
import LogoSlider from '../../LandingPage/Components/LogoSlider'
import Feature from './Components/Feature'
import CollaborationSection from './Components/CollaborationSection'
import FeatureShowcase from './Components/FeatureShowcase'
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
                    <FeatureHero />
                    <LogoSlider />
                    <Feature />
                    <CollaborationSection />
                    <FeatureShowcase />
                </div>
            </div>
            <Footer />
        </div>
    )
}
