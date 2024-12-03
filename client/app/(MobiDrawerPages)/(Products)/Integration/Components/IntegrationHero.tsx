'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import IntegrationIcons from "@/assets/IntegrationIcon"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export default function IntegrationHero() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false })

    // Chia icons thành 2 mảng cho 2 bên
    const leftIcons = IntegrationIcons.slice(0, Math.ceil(IntegrationIcons.length / 2))
    const rightIcons = IntegrationIcons.slice(Math.ceil(IntegrationIcons.length / 2))

    const iconAnimation = {
        hidden: { opacity: 0, y: 20 },
        show: (i: number) => ({
            opacity: 0.6,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.5
            }
        })
    }

    return (
        <div ref={ref} className="w-full min-h-[600px] bg-white pt-12">
            <div className="w-full relative px-4">
                {/* Integration Icons - Left Side */}
                <div className="absolute left-4 lg:left-8 top-0 w-1/4">
                    <div className="grid grid-cols-2 gap-12">
                        {leftIcons.map((icon, i) => (
                            <motion.div
                                key={`left-${i}`}
                                className="p-4 flex items-center justify-center"
                                variants={iconAnimation}
                                initial="hidden"
                                animate={isInView ? "show" : "hidden"}
                                custom={i}
                                whileHover={{ opacity: 1, scale: 1.1 }}
                            >
                                <Image
                                    src={icon.icon}
                                    alt={icon.name}
                                    width={120}
                                    height={120}
                                    className="w-[120px] h-[120px] object-contain"
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <motion.div
                    className="max-w-3xl mx-auto text-center space-y-8 relative z-10 pt-20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="mt-20 text-4xl sm:text-5xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '900px', whiteSpace: 'pre-wrap' }}>
                        Trải nghiệm quy trình làm việc mạnh mẽ và thống nhất
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        MobiDrawer kết nối với hơn 160+ công cụ giúp các nhóm luôn đồng bộ và hiệu quả trong một không gian làm việc có thể mở rộng, an toàn.
                    </p>

                    <motion.div
                        className="max-w-md mx-auto space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    > <Input
                            className="h-[36px] rounded-md text-xl w-full px-4"
                            placeholder="Nhập email của bạn"
                            type="email"
                        />

                        <Button
                            className="h-[36px] w-full bg-blue-600 text-xl hover:bg-blue-700 transition-colors duration-300 text-white"
                        >
                            Đăng ký miễn phí
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Integration Icons - Right Side */}
                <div className="absolute right-4 lg:right-8 top-0 w-1/4">
                    <div className="grid grid-cols-2 gap-12">
                        {rightIcons.map((icon, i) => (
                            <motion.div
                                key={`right-${i}`}
                                className="p-4 flex items-center justify-center"
                                variants={iconAnimation}
                                initial="hidden"
                                animate={isInView ? "show" : "hidden"}
                                custom={i + leftIcons.length}
                                whileHover={{ opacity: 1, scale: 1.1 }}
                            >
                                <Image
                                    src={icon.icon}
                                    alt={icon.name}
                                    width={120}
                                    height={120}
                                    className="w-[120px] h-[120px] object-contain"
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

