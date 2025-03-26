'use client'
import React from 'react'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import Blog from '@/app/(MobiDrawerPages)/(Resources)/Blog/Components/Blog'
import BlogListing from '@/app/(MobiDrawerPages)/(Resources)/Blog/Components/BlogListing'
export default function Layout() {
    return (
        <div>
            <LandingNavbar />
            <div>
                <div className="w-full px-4 md:px-6 lg:px-8 max-w-full md:max-w-[90%] lg:max-w-[calc(100%-250px)] mx-auto">
                    <div className='relative z-20'>
                        <Blog />
                        <BlogListing />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
