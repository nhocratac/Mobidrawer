'use client'

import brain1 from '@/assets/UseCaseImages/brain1.png'
import brain2 from '@/assets/UseCaseImages/brain2.png'
import brain3 from '@/assets/UseCaseImages/brain3.png'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'
import { useInView } from 'react-intersection-observer'

const brainstorming = [
    {
        id: 1,
        title: 'Hình dung ý tưởng của bạn',
        description: 'Hãy tạo ra những ý tưởng mới mẻ và độc đoán bằng cách sử dụng các công cụ tư duy sáng tạo của chúng tôi.',
        src: brain1,
        alt: 'Brainstorming 1',
        width: 600,
        height: 400
    },

    {
        id: 2,
        title: 'Suy luận và phân tích',
        description: 'Hãy sử dụng các công cụ phân tích để tìm ra cách giải quyết vấn đề một cách hợp lý nhất.',
        src: brain2,
        alt: 'Brainstorming 2',
        width: 600,
        height: 400
    },

    {
        id: 3,
        title: 'Tạo ra giải pháp tối ưu',
        description: 'Hãy sử dụng các công cụ tư duy sáng tạo để tạo ra giải pháp tối ưu cho vấn đề của bạn.',
        src: brain3,
        alt: 'Brainstorming 3',
        width: 600,
    }
]

export default function Brainstorming() {
    const [ref] = useInView({
        triggerOnce: false,
        threshold: 0.1,
    })

    const [activeCase, setActiveCase] = useState(0)
    const [showDescription, setShowDescription] = useState(true)

    const handleUseCaseClick = (index: number) => {
        if (activeCase === index) {
            setShowDescription(!showDescription)
        } else {
            setActiveCase(index)
            setShowDescription(true)
        }
    }

    return (
        <section className="py-24 bg-white overflow-hidden" ref={ref}>
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <h2 className="text-6xl sm:text-6xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '800px', whiteSpace: 'pre-wrap' }}>
                        Tư duy sáng tạo
                    </h2>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-16 items-start mt-16">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <motion.div
                            className="bg-yellow-300 rounded-xl overflow-hidden shadow-lg p-8"
                            key={activeCase}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Image
                                src={brainstorming[activeCase].src}
                                alt={brainstorming[activeCase].alt}
                                width={brainstorming[activeCase].width}
                                height={brainstorming[activeCase].height}
                                className="w-full h-auto rounded-lg"
                                priority={activeCase === 0}
                            />
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="space-y-2 my-auto"
                    >
                        {brainstorming.map((brainstorming, index) => (
                            <div key={brainstorming.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: false }}
                                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                                >
                                    <button
                                        onClick={() => handleUseCaseClick(index)}
                                        className={`w-full text-left p-6 rounded-t-xl transition-all duration-300 
                                            ${activeCase === index
                                                ? 'bg-orange-50 shadow-lg scale-[1.02] relative z-10'
                                                : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-2xl font-medium 
                                                ${activeCase === index ? 'text-orange-600' : 'text-gray-700'}`}>
                                                {brainstorming.title}
                                            </span>
                                            {activeCase === index && (
                                                <motion.svg
                                                    className="w-6 h-6 text-orange-600"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                    animate={{
                                                        rotate: showDescription ? 90 : 0
                                                    }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 5l7 7-7 7"
                                                    />
                                                </motion.svg>
                                            )}
                                        </div>
                                    </button>
                                </motion.div>

                                <AnimatePresence>
                                    {activeCase === index && showDescription && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -10 }}
                                            animate={{ opacity: 1, height: "auto", y: 0 }}
                                            exit={{ opacity: 0, height: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="relative -mt-2"
                                        >
                                            <div className="
                                                p-8 
                                                relative
                                                z-0
                                            ">
                                                <div className="flex gap-4 items-start">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2.5" />
                                                    <p className="text-xl text-neutral-600 leading-relaxed">
                                                        {brainstorming.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    )
}