'use client';
import React from 'react';
import LandingNavbar from '../Shared/Components/Header';
import HeroSection from './Components/HeroSection';
import Banner from './Components/Banner';
import LogoSlider from './Components/LogoSlider';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Features from './Components/FeatureSection';
import PricingSection from './Components/PricingSection';
import UseCasesSection from './Components/UseCasesSection';
import InnovativeCompaniesSection from './Components/CompaniesSection';
import CustomizablePlatform from './Components/CustomizablePlatform';
import TestimonialSection from './Components/TestimonialSection';
import Footer from '../Shared/Components/Footer';
export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div>
            <Banner /> {/* Banner stays full width */}
            <LandingNavbar />
            <div className="max-w-[calc(100%-250px)] mx-auto">
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