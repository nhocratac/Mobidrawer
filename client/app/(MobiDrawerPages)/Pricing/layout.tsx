'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import PricingSection from '@/app/(MobiDrawerPages)/Pricing/Components/PricingSection'
export default function Layout() {
    return (
        <div>
            <LandingNavbar />
            <div className='bg-[#FBF7EF]'>
                <div className="w-full px-4 md:px-6 lg:px-8 max-w-full md:max-w-[90%] lg:max-w-[calc(100%-250px)] mx-auto">
                    <div className='relative z-20'>
                        <PricingSection />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
