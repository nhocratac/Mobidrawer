'use client';
import React from 'react';
import LandingNavbar from '../PageComponents/LandingNavbar';
import HeroSection from '../PageComponents/HeroSection';
import Banner from '../PageComponents/Banner';
import LogoSlider from '../PageComponents/LogoSlider';
import SvgGrid from '../PageComponents/SvgGrid';
import Mesh from '../PageComponents/Mesh';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div>
            <div className="w-screen min-h-screen fixed z-10 flex justify-center px-6 pointer-events-none">
                <SvgGrid />
                <Mesh></Mesh>
                <div className="bg-gradient-to-c from-transparent via-transparent to-white absolute insert-0 z-20"></div>
            </div>
            <div className='relative z-20'>
                <Banner />
                <LandingNavbar />
                <div className="container mx-auto">
                    <HeroSection />
                    <LogoSlider />
                </div>
            </div>
        </div>
    )
}