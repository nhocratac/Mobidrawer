'use client'
import { ContactForm } from '@/app/(MobiDrawerPages)/Contact/Components/ContactForm'
import Footer from '@/app/(MobiDrawerPages)/Shared/Components/Footer'
import LandingNavbar from '@/app/(MobiDrawerPages)/Shared/Components/Header'
import { CheckIcon } from 'lucide-react'
import React from 'react'
export default function Layout() {
    return (
        <div>
            <LandingNavbar />
            <div className='py-20'>
                <div className="max-w-[calc(100%-250px)] mx-auto flex flex-col md:flex-row">
                    <div className='w-full md:w-1/2'>
                        <h2 className="text-6xl sm:text-6xl font-medium text-left mb-8 leading-tight py-12">
                            Hãy liên hệ với chúng tôi
                        </h2>
                        <ul>
                            <li className='flex gap-4 py-4'>
                                <CheckIcon className="w-8 h-8 text-[#FDE050]" />
                                <span className="text-3xl">Để học cách giúp đội của bạn hợp tác hiệu quả hơn.</span>
                            </li>
                            <li className='flex gap-4 py-4'>
                                <CheckIcon className="w-8 h-8 text-[#FDE050]" />
                                <span className="text-3xl" style={{ maxWidth: 500 }}>Để trải nghiệm MobiDrawer qua buổi demo trực tiếp, được thiết kế riêng cho doanh nghiệp của bạn.</span>
                            </li>
                            <li className='flex gap-4 py-4'>
                                <CheckIcon className="w-8 h-8 text-[#FDE050]" />
                                <span className="text-3xl" style={{ maxWidth: 500 }}>Tìm hiểu cách MobiDrawer giúp bạn mở rộng quy mô một cách mượt mà, đáp ứng mọi nhu cầu của tổ chức.</span>
                            </li>
                        </ul>
                    </div>
                    <div className='w-full md:w-1/2'>
                        <ContactForm />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    )
}
