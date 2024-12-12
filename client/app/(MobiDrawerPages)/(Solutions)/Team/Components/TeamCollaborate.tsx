'use client'

import team4 from '@/assets/TeamImages/team4.png'
import { Button } from "@/components/ui/button"
import { motion, useInView } from "framer-motion"
import Image from "next/image"
import { useRef } from "react"

export default function HeroSection() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false })

    return (
        <section ref={ref} className="container px-4 py-12 mx-auto md:py-16 lg:py-20">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.3 }}
                className="text-center mb-16"
            >
                <h2 className="text-6xl sm:text-6xl text-center text mb-8 mx-auto px-4 leading-tight"
                    style={{ lineHeight: '1.5', maxWidth: '800px', whiteSpace: 'pre-wrap' }}>
                    Giao tiếp, tài liệu và lập kế hoạch hiệu quả hơn, tất cả trên một nền tảng
                </h2>
                <p className="text-neutral-500 text-2xl max-w-4xl mx-auto"
                    style={{ maxWidth: '740px' }}>
                    Với các tính năng hợp tác tiên tiến, giúp công việc nhóm thời gian thực và không đồng bộ trở nên dễ dàng, bạn có thể chuyển từ giai đoạn khám phá chưa có cấu trúc sang kết quả có tổ chức, tất cả trong MobiDrawer
                </p>
            </motion.div>
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center border rounded-3xl pt-20 pl-20 shadow-lg ">
                <motion.div
                    className="space-y-8 mb-20 ml-10"
                    initial={{ opacity: 0, x: -50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.h2
                        className="text-6xl sm:text-6xl text-left mb-8 leading-tight"
                        style={{ lineHeight: '1.2', maxWidth: '400px', whiteSpace: 'pre-wrap' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Căn chỉnh, phác thảo và thúc đẩy chiến lược
                    </motion.h2>
                    <motion.p
                        className="text-neutral-500 text-xl max-w-4xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        style={{ maxWidth: '360px' }}
                    >
                        Biến kế hoạch thành hành động từ chiến lược đến thực thi. Tổ chức các buổi khởi động đầy năng lượng, cùng nhau xây dựng và hoàn thiện chiến lược, đồng thời quản lý và giám sát tiến độ trên tất cả các dự án của bạn
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <a href="" className="inline-block">
                            <Button
                                className="bg-black text-white hover:bg-black/80 text-2xl px-8 py-8"
                            >
                                Dùng thử miễn phí
                            </Button>
                        </a>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Image
                            src={team4}
                            alt="team"
                            width={664}
                            height={498}
                            className="rounded-br-3xl rounded-tl-3xl w-full h-full object-cover"
                            priority
                        />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
