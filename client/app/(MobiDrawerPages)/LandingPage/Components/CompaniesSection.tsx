'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import CompaniesImg from '@/assets/LandingPageImages/CompaniesImg'
import { Button } from "@/components/ui/button"

export default function InnovativeCompaniesSection() {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            nextSlide()
        }, 5000)

        return () => clearInterval(timer)
    }, [])

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % CompaniesImg.length)
    }

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + CompaniesImg.length) % CompaniesImg.length)
    }

    return (
        <motion.section 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className="py-24 bg-white"
        >
            <div className="container mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6 }}
                    className="mb-16"
                >
                    <h2 className="text-6xl sm:text-6xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '900px', whiteSpace: 'pre-wrap' }}>
                        Các công ty sáng tạo trên thế giới đang xây dựng sản phẩm của mình với MobiDrawer
                    </h2>
                    <p className="text-neutral-500 text-2xl max-w-4xl mx-auto mb-12"
                        style={{ maxWidth: '700px', whiteSpace: 'pre-wrap' }}>
                        Hơn 250.000 tổ chức, bao gồm Nike, Ikea, Deloitte và Cisco, đã sử dụng MobiDrawer để giúp tăng tốc và quản lý toàn bộ vòng đời đổi mới của họ.
                    </p>

                    <Button className='text-white bg-black hover:bg-black/80 py-6 text-lg'>Tìm hiểu thêm</Button>
                    
                </motion.div>

                <div className="relative max-w-[800px] mx-auto px-8">
                    <div className="relative h-[400px] overflow-hidden rounded-3xl">
                        {CompaniesImg.map((company, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{
                                    opacity: currentIndex === index ? 1 : 0,
                                    scale: currentIndex === index ? 1 : 0.95,
                                    x: `${(index - currentIndex) * 100}%`
                                }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="absolute top-0 left-0 w-full h-full"
                            >
                                <div className="relative w-full h-full">
                                    <Image
                                        src={company.src}
                                        alt={`${company.alt} showcase`}
                                        fill
                                        className="object-cover rounded-xl"
                                        priority
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="absolute top-1/2 -translate-y-1/2 w-full left-0 px-4 flex justify-between pointer-events-none">
                        <button
                            onClick={prevSlide}
                            className="pointer-events-auto bg-white/90 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="pointer-events-auto bg-white/90 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex justify-center gap-2 mt-4">
                        {CompaniesImg.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all ${currentIndex === index ? 'bg-black w-6' : 'bg-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </motion.section>
    )
}