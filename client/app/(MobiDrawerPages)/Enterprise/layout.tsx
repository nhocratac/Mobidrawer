'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import EnterpriseHero from '@/app/(MobiDrawerPages)/Enterprise/Components/EnterpriseHero'
import EnterpriseMisson from '@/app/(MobiDrawerPages)/Enterprise/Components/EnterpriseMisson'
import EnterpriseMembers from '@/app/(MobiDrawerPages)/Enterprise/Components/EnterpriseMembers'
import Offices from '@/app/(MobiDrawerPages)/Enterprise/Components/Offices'
export default function Layout() {
    return (
        <div>
            <LandingNavbar />
            <div className='bg-[#FBF7EF]'>
                <div className="max-w-[calc(100%-250px)] mx-auto ">
                    <div className='relative z-20'>
                        <EnterpriseHero />
                        <EnterpriseMisson />
                        <EnterpriseMembers />
                        <Offices />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
