'use client'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider'
import SecurityHero from '@/app/(MobiDrawerPages)/(Products)/Security/Components/SecurityHero'
import DataProtection from '@/app/(MobiDrawerPages)/(Products)/Security/Components/DataProtection'
export default function Security() {
    return (
        <div>
            <LandingNavbar />
            <div className="w-full px-4 sm:px-6 md:px-8 lg:max-w-[calc(100%-250px)] mx-auto">
                <div className='relative z-20'>
                    <SecurityHero />
                    <LogoSlider />
                    <DataProtection />
                </div>
            </div>
            <Footer />
        </div>
    )
}