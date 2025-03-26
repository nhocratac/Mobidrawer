'use client'
import { ContactForm } from '@/app/(MobiDrawerPages)/Contact/Components/ContactForm'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import { CheckIcon } from 'lucide-react'
import React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-screen h-full">
            <LandingNavbar />
            <main className='py-8 sm:py-12 md:py-20 flex-grow flex flex-col'>
                <div className="max-w-[85%] lg:max-w-[calc(100%-250px)] mx-auto flex flex-col md:flex-row gap-8 flex-grow">
                    <div className='w-full md:w-1/2'>
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-left mb-4 sm:mb-8 leading-tight py-6 sm:py-12">
                            Hãy liên hệ với chúng tôi
                        </h2>
                        <ul className='space-y-2 sm:space-y-4'>
                            <li className='flex gap-2 sm:gap-4 py-2 sm:py-4'>
                                <CheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-[#FDE050] flex-shrink-0" />
                                <span className="text-xl sm:text-2xl lg:text-3xl">Để học cách giúp đội của bạn hợp tác hiệu quả hơn.</span>
                            </li>
                            <li className='flex gap-2 sm:gap-4 py-2 sm:py-4'>
                                <CheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-[#FDE050] flex-shrink-0" />
                                <span className="text-xl sm:text-2xl lg:text-3xl">Để trải nghiệm MobiDrawer qua buổi demo trực tiếp, được thiết kế riêng cho doanh nghiệp của bạn.</span>
                            </li>
                            <li className='flex gap-2 sm:gap-4 py-2 sm:py-4'>
                                <CheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-[#FDE050] flex-shrink-0" />
                                <span className="text-xl sm:text-2xl lg:text-3xl">Tìm hiểu cách MobiDrawer giúp bạn mở rộng quy mô một cách mượt mà, đáp ứng mọi nhu cầu của tổ chức.</span>
                            </li>
                        </ul>
                    </div>
                    <div className='w-full md:w-1/2'>
                        <ContactForm />
                    </div>
                </div>
                {children}
            </main>
            <Footer />
        </div>
    )
}
