'use client'

import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import Image from 'next/image'
import usecasehero from "@/assets/UseCaseImages/usecasehero.png"
import Link from 'next/link'
export default function UseCaseHero() {
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
                        className="text-4xl sm:text-6xl lg:text-7xl text-center tracking-wide mt-6 lg:mt-20"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6 }}
                    >
                        Công cụ hợp tác cho công việc hàng ngày
                       
                    </motion.h1>

                    <motion.h2
                        className="mt-10 text-2xl text-center text-neutral-500 max-w-4xl"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Khám phá các tính năng mạnh mẽ phù hợp với nhu cầu công việc của bạn
                    </motion.h2>

                    <motion.div
                        className="mx-auto mt-10 mb-20 flex flex-col items-center gap-4  max-w-md"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <Link href="/user/dashboard">
                            <Button
                                className="py-8 px-4 w-full bg-blue-600 text-2xl hover:bg-blue-700 transition-colors duration-300 text-white"
                            >
                                Đi đến bảng điều khiển
                            </Button>
                        </Link>
                    </motion.div>

                    <motion.div
                        className="flex mt-10 item-center justify-center"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <div className="mb-12 rounded-xl border-8 border-yellow-300 bg-gray-200">
                            <Image
                                src={usecasehero}
                                alt="Features Overview"
                                width={1024}
                                height={768}
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