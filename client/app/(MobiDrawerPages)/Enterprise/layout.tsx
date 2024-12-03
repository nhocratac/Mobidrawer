'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import EnterpriseHero from './Components/EnterpriseHero'
import EnterpriseMisson from './Components/EnterpriseMisson'
import EnterpriseMembers from './Components/EnterpriseMembers'
import Offices from './Components/Offices'
export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
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
