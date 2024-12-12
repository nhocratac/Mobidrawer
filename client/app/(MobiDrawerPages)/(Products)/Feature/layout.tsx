'use client'

import CollaborationSection from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/CollaborationSection'
import Feature from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/Feature'
import FeatureHero from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/FeatureHero'
import FeatureShowcase from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/FeatureShowcase'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import React from 'react'
export default function Layout() {
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
