"use client";
import React, { useState } from 'react';
import Slack from '@/assets/logo/slack';
import { Menu, X } from "lucide-react";

const Navbar = () => {
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const toggleNavbar = () => {
        setMobileDrawerOpen(!mobileDrawerOpen);
    };

    return (
        <nav className='sticky top-0 z-50 h-[56px] backdrop-blur-lg border-b border-neutral-700/8'>
            <div className="container px-4 mx-auto relative h-full text-[16px]">
                <div className="flex justify-between items-center h-full pl-[40px] pr-[40px]">
                    <div className="flex items-center flex-shrink-0">
                        <Slack  />
                        <span className="text-xl tracking-tight">MobiDrawer</span>
                    </div>
                    <ul className='hidden lg:flex ml-14 space-x-12'>
                        <li>
                            <a href="#features" className="text-neutral-900 hover:text-primary-500">Features</a>
                        </li>
                        <li>
                            <a href="#pricing" className="text-neutral-900 hover:text-primary-500">Pricing</a>
                        </li>
                        <li>
                            <a href="#testimonials" className='text-neutral-900 hover:text-primary-500'>Testimonials</a>
                        </li>
                        <li>
                            <a href="#contact" className="text-neutral-900 hover:text-primary-500">Contact</a>
                        </li>
                    </ul>
                    <div className="hidden lg:flex justify-center space-x-12 items-center">
                        <a href="/login" className="py-2 px-3 border rounded-md">Log in</a>
                        <a href="/register" className="bg-gradient-to-r from-orange-500 to-orange-800 py-2 px-3 rounded-md">Sign up free</a>
                    </div>
                    <div className="lg:hidden md:flex flex-col justify-end">
                        <button onClick={toggleNavbar} className="focus:outline-none">
                            {mobileDrawerOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer */}
                <div
                    className={`fixed top-[56px] right-0 z-20 w-full h-[calc(100vh-56px)] bg-black p-12 flex flex-col justify-center items-center transform transition-transform duration-300 ease-in-out lg:hidden ${mobileDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
                >
                    <ul className="space-y-4 text-center">
                        <li>
                            <a href="#features" className="text-white hover:text-primary-500">Features</a>
                        </li>
                        <li>
                            <a href="#pricing" className="text-white hover:text-primary-500">Pricing</a>
                        </li>
                        <li>
                            <a href="#testimonials" className='text-white hover:text-primary-500'>Testimonials</a>
                        </li>
                        <li>
                            <a href="#contact" className="text-white hover:text-primary-500">Contact</a>
                        </li>
                    </ul>
                    <div className='flex space-x-6 mt-8'>
                        <a href="/login" className="py-2 px-3 border rounded-md text-white">Log in</a>
                        <a href="/register" className="bg-gradient-to-r from-orange-500 to-orange-800 py-2 px-3 rounded-md text-white">Sign up free</a>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
