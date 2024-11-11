// IconSlider.tsx
import React from 'react';
import Slider from 'react-slick';
import Image from 'next/image';
import landingPageLogo from '@/assets/LandingPageLogo';

export default function LogoSlider() {
    // Slider settings
    const settings = {
        dots: false,               // Show navigation dots
        infinite: true,           // Loop slides
        speed: 700,               // Transition speed in ms
        slidesToShow: 5,          // Slides per row
        slidesToScroll: 1,        // Number of slides to scroll at a time
        rows: 2,                  // Two rows for a grid effect
        autoplay: true,           // Autoplay slides
        autoplaySpeed: 2000,      // Delay between slides in ms
        pauseOnHover: true,       // Pause autoplay on hover
        fade: false,              // Set to true for fade effect (only works with single row and `slidesToShow` set to 1)
        cssEase: 'ease-in-out',   // Custom easing for transitions
    };

    return (
        <>
            <Slider {...settings}>
                {landingPageLogo.map((logo, index) => (
                    <div
                        key={logo.id}
                        className={index % 2 === 0 ? 'staggeredRow' : ''}
                        style={{ display: 'flex', justifyContent: 'center' }}
                    >
                        <Image
                            src={logo.src}
                            alt={logo.alt}
                            width={100} // smaller width
                            height={50} // smaller height
                        />
                    </div>
                ))}
            </Slider>


        </>
    );
}
