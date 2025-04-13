'use client'
import React from 'react'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import EventSection from '@/app/(MobiDrawerPages)/Events/Components/EventSection'
import EventHero from '@/app/(MobiDrawerPages)/Events/Components/EventHero'
export default function Events() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <LandingNavbar />
        <EventHero />
        <div className="w-full px-4 sm:px-6 md:px-8 lg:max-w-[calc(100%-250px)] mx-auto">
          <div className='relative z-20'>
            <EventSection />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
