'use client'
import React from 'react'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import EventSection from '@/app/(MobiDrawerPages)/Events/Components/EventSection'
import EventHero from '@/app/(MobiDrawerPages)/Events/Components/EventHero'
export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div>
            <div>
                <LandingNavbar />
                <EventHero />
                <div className="max-w-[calc(100%-250px)] mx-auto ">
                    <div className='relative z-20'>
                        <EventSection />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
