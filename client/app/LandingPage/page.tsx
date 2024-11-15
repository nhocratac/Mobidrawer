import React from 'react';
import LandingNavbar from '@/components/PageComponents/LandingNavbar';
import HeroSection from '@/components/PageComponents/HeroSection';
import Banner from '@/components/PageComponents/Banner';
import LogoSlider from '@/components/PageComponents/LogoSlider';
import SvgGrid from '@/components/PageComponents/SvgGrid';
import Mesh from '@/components/PageComponents/Mesh';
import "slick-carousel/slick/slick-theme.css";
export default function Page() {
  return (
    <>
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
      </div></>
  )
}
