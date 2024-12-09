"use client";
import React, { useState } from 'react';
import { Menu, X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import path from '@/utils/path';

const navLinks = [
    { href: "#products", label: "Sản phẩm" },
    { href: "#solutions", label: "Giải pháp" },
    { href: "/Enterprise", label: "Doanh nghiệp" },
    { href: "#Resources", label: "Tài nguyên" },
    { href: "/Pricing", label: "Giá cả" },
    { href: "/Contact", label: "Liên hệ" },

];

const productDropdownItems = [
    { href: "/Feature", label: "Các tính năng" },
    { href: "/Integration", label: "Tích hợp" },
    { href: "/Security", label: "Bảo mật" },
];

const solutionDropdownItems = [
    {
        href: "/UseCase", label: "Trường hợp sử dụng",
    },
    {
        href: "/Team", label: "Đội ngũ",
    }
];

const resourcesDropdownItems = [
    {
        href: "/Blog", label: "Blog",
    },
    {
        href: "/HelpCenter", label: "Trung tâm trợ giúp",
    },

    {
        href: "/Events", label: "Sự kiện",
    }
];


const Navbar = () => {
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='sticky top-0 z-50 h-[60px] backdrop-blur-lg border-b border-neutral-700/8'
        >
            <div className="container px-10 mx-auto relative h-full text-[16px]">
                <div className="flex justify-between items-center h-full pl-[40px] pr-[40px]">
                    <motion.div
                        className="flex items-center flex-shrink-0 cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                    >
                        <Link href={path.home} className="flex items-center">
                            <span className="text-2xl font-semibold bg-gradient-to-r from-orange-500 to-orange-800 bg-clip-text text-transparent ">
                                MobiDrawer
                            </span>
                        </Link>
                    </motion.div>
                    <ul className='hidden lg:flex ml-14 space-x-12'>
                        {navLinks.map((link) => (
                            <div key={link.href} className="relative group">
                                <a
                                    href={link.href}
                                    className="text-neutral-900 hover:text-orange-600 transition-colors duration-200 flex items-center gap-1"
                                >
                                    {link.label}
                                    {link.label === "Sản phẩm" && <ChevronDown className="h-4 w-4" />}
                                    {link.label === "Giải pháp" && <ChevronDown className="h-4 w-4" />}
                                    {link.label === "Tài nguyên" && <ChevronDown className="h-4 w-4" />}
                                </a>

                                {link.label === "Sản phẩm" && (
                                    <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 top-full left-0 mt-1">
                                        <div className="bg-white rounded-lg shadow-lg min-w-[220px]">
                                            {productDropdownItems.map((item) => (
                                                <a
                                                    key={item.href}
                                                    href={item.href}
                                                    className="block px-4 py-2 text-neutral-900 hover:bg-orange-50 hover:text-orange-600"
                                                >
                                                    {item.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {link.label === "Giải pháp" && (
                                    <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 top-full left-0 mt-1">
                                        <div className="bg-white rounded-lg shadow-lg min-w-[220px]">
                                            {solutionDropdownItems.map((item) => (
                                                <a
                                                    key={item.href}
                                                    href={item.href}
                                                    className="block px-4 py-2 text-neutral-900 hover:bg-orange-50 hover:text-orange-600"
                                                >
                                                    {item.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {link.label === "Tài nguyên" && (
                                    <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 top-full left-0 mt-1">
                                        <div className="bg-white rounded-lg shadow-lg min-w-[220px]">
                                            {resourcesDropdownItems.map((item) => (
                                                <a
                                                    key={item.href}
                                                    href={item.href}
                                                    className="block px-4 py-2 text-neutral-900 hover:bg-orange-50 hover:text-orange-600"
                                                >
                                                    {item.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </ul>

                    <div className="hidden lg:flex justify-center space-x-4 items-center">
                        <Link href='/login'>
                            <Button variant="outline" size="lg"
                                className="bg-white py-4 px-4 border text-xl border-neutral-200 hover:border-yellow-300 transition-colors duration-200"
                            >
                                Đăng nhập
                            </Button>
                        </Link>
                        <Link href='/register'>
                            <Button
                                className="py-2 px-4 text-xl bg-blue-600 hover:bg-blue-700 text-white hover:opacity-90 transition-opacity duration-200"
                            >
                                Đăng ký miễn phí
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden md:flex flex-col justify-end">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                            className="focus:outline-none"
                        >
                            {mobileDrawerOpen ? <X size={24} /> : <Menu size={24} />}
                        </motion.button>
                    </div>
                </div>


                <motion.div
                    initial={false}
                    animate={{
                        x: mobileDrawerOpen ? 0 : '100%',
                        opacity: mobileDrawerOpen ? 1 : 0
                    }}
                    transition={{ type: "spring", damping: 20 }}
                    className="fixed top-[64px] right-0 z-20 w-full h-[calc(100vh-64px)] bg-white/95 backdrop-blur-lg p-8 flex flex-col justify-center items-center lg:hidden"
                >
                    <ul className="space-y-6 text-center">
                        {navLinks.map((link) => (
                            <motion.li
                                key={link.href}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <a
                                    href={link.href}
                                    className="text-xl text-neutral-800 hover:text-orange-600 transition-colors duration-200"
                                >
                                    {link.label}
                                </a>
                            </motion.li>
                        ))}
                    </ul>
                    <div className='flex flex-col gap-4 mt-8 w-full max-w-[200px]'>
                        <Button variant="outline" size="lg"
                            className="bg-white py-4 px-4 border text-xl border-neutral-200 hover:border-yellow-300 transition-colors duration-200"
                        >
                            Đăng nhập
                        </Button>
                        <Button
                            className="py-2 px-4 text-xl bg-blue-600 hover:bg-blue-700 text-white hover:opacity-90 transition-opacity duration-200"
                        >
                            Đăng ký miễn phí
                        </Button>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};


export default Navbar;


