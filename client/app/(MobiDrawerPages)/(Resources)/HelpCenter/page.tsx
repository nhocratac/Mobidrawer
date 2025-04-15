'use client'

import HelpCenterHero from '@/app/(MobiDrawerPages)/(Resources)/HelpCenter/Components/HelpCenterHero'
import KnowledgeBase from '@/app/(MobiDrawerPages)/(Resources)/HelpCenter/Components/KnowledgeBase'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
export default function HelpCenter() {
  return (
    <div className="min-h-screen flex flex-col">
    <div className="flex-1">
        <LandingNavbar />
        <HelpCenterHero />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className='relative z-20 w-full max-w-7xl mx-auto'>
                <KnowledgeBase />
            </div>
        </div>
    </div>
    <Footer />
</div>
  )
}
