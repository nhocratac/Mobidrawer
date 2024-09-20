'use client';
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className='relative'>
      {/* Hamburger Button */}
      <div className='md:hidden block z-50'>
        <Button
          size={'icon'}
          variant={'outline'}
          className='block'
          onClick={toggleMenu}
        >
          <Menu/>
        </Button>
      </div>

      {/* Menu Items */}
      <div
        className={`fixed top-0 left-0 w-[min(200px,20%)] h-full bg-white shadow-lg p-4 z-40 transition-transform duration-500 ease-in-out ${
          isOpen ? 'translate-x-0 ' : '-translate-x-full'
        }`}
      >
        <X onClick={toggleMenu}/>
        <ul className='space-y-4 text-left'>
          <li><a href="#home" className='block hover:bg-gray-200 p-4 rounded'>Home</a></li>
          <li><a href="#about" className='block hover:bg-gray-200 p-4 rounded'>About</a></li>
          <li><a href="#services" className='block hover:bg-gray-200 p-4 rounded'>Services</a></li>
          <li><a href="#contact" className='block hover:bg-gray-200 p-4 rounded'>Contact</a></li>
        </ul>
      </div>
    </div>
  );
};

export default HamburgerMenu;
