'use client'

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import blog1 from "@/assets/BlogImages/blog1.png"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export default function HeroSection() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false })

    return (
        <section ref={ref} className="container px-4 py-12 mx-auto md:py-16 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center border rounded-3xl bg-black pl-20 shadow-lg ">
                <motion.div
                    className="space-y-8 mb-20 ml-10"
                    initial={{ opacity: 0, x: -50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.h2
                        className="text-6xl sm:text-6xl text-left mb-8 leading-tight text-white"
                        style={{ lineHeight: '1.2', maxWidth: '500px', whiteSpace: 'pre-wrap' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Tìm ý tưởng nhanh chóng với blog của chúng tôi
                    </motion.h2>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <a href="" className="inline-block">
                            <Button
                                className="bg-black border text-white hover:bg-blue-700 text-2xl px-8 py-8"
                            >
                                Đọc ngay
                            </Button>
                        </a>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <Image
                        src={blog1}
                        alt="team"
                        width={742}
                        height={389}
                        className="w-full h-full object-cover rounded-tr-3xl rounded-br-3xl"
                        priority
                    />
                </motion.div>
            </div>
        </section>
    )
}
