'use client'

import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import FeatureHero from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/FeatureHero'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import Feature from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/Feature'
import CollaborationSection from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/CollaborationSection'
import FeatureShowcase from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/FeatureShowcase'
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
