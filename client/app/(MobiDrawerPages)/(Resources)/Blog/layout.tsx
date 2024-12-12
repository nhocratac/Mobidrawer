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
                <div className="max-w-[calc(100%-250px)] mx-auto ">
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
