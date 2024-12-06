'use client'

import { Button } from "@/components/ui/button"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export default function IntegrationHero() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false })


    return (
        <div ref={ref} className="w-full min-h-[400px] bg-white">
            <div className="w-full relative px-4">
                <motion.div
                    className="mx-auto text-center space-y-8 relative z-10 pt-20"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="mt-20 text-4xl sm:text-5xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '560px', whiteSpace: 'pre-wrap' }}>
                        Được tin cậy bởi những doanh nghiệp coi trọng bảo mật nhất
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto"
                        style={{ lineHeight: '1.5', maxWidth: '400px', whiteSpace: 'pre-wrap' }}
                    >
                        MobiDrawer được xây dựng với những tiêu chuẩn bảo mật cao nhất, đảm bảo an toàn cho dữ liệu của bạn.
                    </p>

                    <motion.div
                        className="max-w-md mx-auto space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Button
                            className="h-[36px] w-1/2 bg-blue-600 text-xl hover:bg-blue-700 transition-colors duration-300 text-white"
                        >
                            Liên hệ ngay
                        </Button>
                    </motion.div>
                </motion.div>

            </div>
        </div>
    )
}

