'use client'
import React from 'react'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import HelpCenterHero from '@/app/(MobiDrawerPages)/(Resources)/HelpCenter/Components/HelpCenterHero'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import KnowledgeBase from '@/app/(MobiDrawerPages)/(Resources)/HelpCenter/Components/KnowledgeBase'

export default function Layout() {
    return (
        <div>
            <div>
                <LandingNavbar />
                <HelpCenterHero />
                <div className="max-w-[calc(100%-250px)] mx-auto ">
                    <div className='relative z-20'>
                        <KnowledgeBase />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
