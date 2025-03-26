'use client';
import React from 'react';
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header';
import HeroSection from '@/app/(MobiDrawerPages)/LandingPage/Components/HeroSection';
import Banner from '@/app/(MobiDrawerPages)/LandingPage/Components/Banner';
import LogoSlider from '@/app/(MobiDrawerPages)/LandingPage/Components/LogoSlider';
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import Features from '@/app/(MobiDrawerPages)/LandingPage/Components/FeatureSection';
import UseCasesSection from '@/app/(MobiDrawerPages)/LandingPage/Components/UseCasesSection';
import InnovativeCompaniesSection from '@/app/(MobiDrawerPages)/LandingPage/Components/CompaniesSection';
import CustomizablePlatform from '@/app/(MobiDrawerPages)/LandingPage/Components/CustomizablePlatform';
import TestimonialSection from '@/app/(MobiDrawerPages)/LandingPage/Components/TestimonialSection';
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer';
export default function Layout() {
    return (
        <div>
            <Banner />
            <LandingNavbar />
            <div className="w-full px-4 md:px-6 lg:px-8 xl:max-w-[1440px] mx-auto">
                <div className='relative z-20'>
                    <HeroSection />
                    <LogoSlider />
                    <UseCasesSection />
                    <Features />
                    <InnovativeCompaniesSection />
                    <CustomizablePlatform />
                    <TestimonialSection />
                </div>
            </div>
            <Footer />
        </div>
    )
}