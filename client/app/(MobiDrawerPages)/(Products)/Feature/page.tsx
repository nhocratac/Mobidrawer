'use client'

import CollaborationSection from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/CollaborationSection'
import FeatureHero from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/FeatureHero'
import FeatureShowcase from '@/app/(MobiDrawerPages)/(Products)/Feature/Components/FeatureShowcase'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import React from 'react'
export default function Feature() {
  return (
    <div>
      <LandingNavbar />
      <div className="w-full px-4 sm:px-6 md:px-8 lg:max-w-[calc(100%-250px)] mx-auto">
        <div className='relative z-20'>
          <FeatureHero />
          <LogoSlider />
          <CollaborationSection />
          <FeatureShowcase />
        </div>
      </div>
      <Footer />
    </div>
  );
}
