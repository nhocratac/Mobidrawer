'use client'

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import team from '@/assets/TeamImages/team.png'
import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export default function HeroSection() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false })

    return (
        <section ref={ref} className="container px-4 py-12 mx-auto md:py-16 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
                <motion.div
                    className="space-y-8"
                    initial={{ opacity: 0, x: -50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.h2
                        className="text-6xl sm:text-6xl text-left mb-8 leading-tight"
                        style={{ lineHeight: '1.2', maxWidth: '500px', whiteSpace: 'pre-wrap' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Nơi các đội ngũ IT chuyển đổi và cung cấp nhanh hơn
                    </motion.h2>
                    <motion.p
                        className="text-neutral-500 text-xl max-w-4xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Ra quyết định nhanh chóng và hiệu quả, kết nối chặt chẽ với các bên liên quan, đồng thời đơn giản hóa những vấn đề phức tạp. Đây là không gian làm việc thông minh với sự hỗ trợ của AI, giúp bạn trực quan hóa chiến lược, quy trình và hệ thống IT một cách rõ ràng và mạnh mẽ.
                    </motion.p> 
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link href="\user\dashboard">
                                <Button
                                    className="bg-black text-white hover:bg-black/80 text-2xl px-8 py-8"
                                >
                                    Dùng thử miễn phí
                                </Button>
                            </Link>
                        </motion.div>
                </motion.div>

                <motion.div
                    className="p-4"
                    initial={{ opacity: 0, x: 50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Image
                            src={team}
                            alt="team"
                            width={664}
                            height={498}
                            className="rounded-3xl w-full h-full object-cover"
                            priority
                        />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
