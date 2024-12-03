'use client'

import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import Image from 'next/image'
import about from '@/assets/TeamImages/about.png'
import { Input } from "@/components/ui/input"

export default function HeroSection() {
    return (
        <div className="relative min-h-[800px]">
            <div className="container mx-auto">
                <motion.div
                    className="flex flex-col items-center relative z-10"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.h1
                        className="text-4xl sm:text-6xl lg:text-8xl text-center tracking-wide mt-6 lg:mt-20"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6 }}
                    >
                        The best work is 
                        <span className="bg-gradient-to-r from-orange-500 to-red-800 text-transparent bg-clip-text">
                            {" "}
                            teamwork
                        </span>
                    </motion.h1>

                    <motion.h2
                        className="mt-10 text-2xl text-center text-neutral-500 max-w-5xl"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        MobiDrawer mang đến không gian làm việc trực quan cho sự đổi mới, giúp các team phân tán ở mọi quy mô cùng nhau sáng tạo, thiết kế và kiến tạo tương lai
                    </motion.h2>
                    <motion.div
                        className="flex item-center justify-center"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <div className="my-20">
                            <Image
                                src={about}
                                alt="About Us" 
                                width={1120}
                                height={660}
                                className="rounded-lg w-full h-full object-cover"
                                priority
                            />
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}