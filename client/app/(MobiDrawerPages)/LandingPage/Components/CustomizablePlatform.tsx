'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import PlatformImg from '@/assets/LandingPageImages/PlatformImg'

export default function CustomizablePlatformSection() {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(true)

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 876 // 219 * 4 (4 cards at once)

            if (direction === 'right') {
                scrollContainerRef.current.scrollTo({
                    left: scrollAmount,
                    behavior: 'smooth'
                })
                setShowLeftArrow(true)
                setShowRightArrow(false)
            } else {
                scrollContainerRef.current.scrollTo({
                    left: 0,
                    behavior: 'smooth'
                })
                setShowLeftArrow(false)
                setShowRightArrow(true)
            }
        }
    }

    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-6xl sm:text-6xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '800px', whiteSpace: 'pre-wrap' }}>
                        Làm việc theo cách của bạn trên một nền tảng tùy chỉnh duy nhất
                    </h2>
                    <p className="text-neutral-500 text-2xl max-w-4xl mx-auto mb-12"
                        style={{ maxWidth: '600px', whiteSpace: 'pre-wrap' }}>
                        Tạo mẫu quy trình và kết nối hơn 160+ công cụ yêu thích để làm việc theo cách của bạn
                    </p>
                </motion.div>

                <div className="relative">

                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory hide-scrollbar"
                    >
                        {PlatformImg.map((card, index) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                className="mr-4 flex-none w-[219px] h-[279px] snap-center flex flex-col rounded-3xl p-8 border border-neutral-300 cursor-pointer hover:shadow-lg hover:shadow-neutral-300"
                            >
                                <h3 className="text-3xl sm:text-3xl text-left text mb-8 mx-auto leading-tight h-[45px]">
                                    {card.title}
                                </h3>
                                <div className="relative flex-1 rounded-xl overflow-hidden">
                                    <Image
                                        src={card.src}
                                        alt={card.alt}
                                        width={card.width}
                                        height={card.height}
                                        className="object-cover"
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Left Arrow */}
                    {showLeftArrow && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </motion.button>
                    )}

                    {/* Right Arrow */}
                    {showRightArrow && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </motion.button>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </section>
    )
}