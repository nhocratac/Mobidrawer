'use client'

import Image from "next/image"
import Link from "next/link"
import City from "@/assets/Offices/index"
import { motion } from "framer-motion"
import { useRef } from "react"
import { useInView } from "framer-motion"
import HelpCenterImages from "@/assets/HelpCenterImages"

export default function HelpCenter() {
    const ref = useRef(null)
    const isInView = useInView(ref, {
        once: false,
        margin: "-100px",
    })

    const advice = [
        {
            title: "Người mới bắt đầu",
            description: "Chào mừng đến với MobiDrawer! Hãy bắt đầu nhanh hơn bằng cách tìm hiểu một số kiến thức cơ bản.",
            image: HelpCenterImages[0].image,
        },
        {
            title: "Hướng dẫn sử dụng",
            description: "Hãy tìm hiểu cách sử dụng MobiDrawer để tận dụng tối đa công cụ hữu ích này.",
            image: HelpCenterImages[1].image,
        },
        {
            title: "Gói dịch vụ & Thanh toán",
            description: "Có câu hỏi về gói dịch vụ hoặc đăng ký của chúng tôi? Tìm câu trả lời tại đây.",
            image: HelpCenterImages[2].image,
        },
        {
            title: "Quản trị",
            description: "Làm chủ mọi khía cạnh trong quản lý nhóm và người dùng trên các gói Free, Team, Consultant, Business, và Education.",
            image: HelpCenterImages[3].image,
        },
        {
            title: "Tích hợp & Ứng dụng",
            description: "Khám phá sức mạnh của các tích hợp và ứng dụng từ MobiDrawer.",
            image: HelpCenterImages[4].image,
        },
        {
            title: "Cập nhật & Sửa lỗi",
            description: "Xem thông tin về cập nhật và sửa lỗi mới nhất của MobiDrawer.",
            image: HelpCenterImages[5].image,
        },

        
       

    ]

    const container = {
        hidden: {
            opacity: 0,
            transition: {
                staggerChildren: 0.1
            }
        },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.1
            }
        }
    }

    const item = {
        hidden: {
            opacity: 0,
            y: 50,
            transition: {
                duration: 0.3
            }
        },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    }

    return (
        <section ref={ref} className="w-full py-12 md:py-24 lg:py-32">
            <div className="px-4 md:px-6">
                <motion.div
                    className="grid gap-6 md:gap-8 lg:gap-10 md:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    {advice.map((advice, index) => (
                        <motion.div
                            key={index}
                            className=" p-6 transition-all duration-300"
                            variants={item}
                            whileHover={{
                                cursor: "pointer",
                                y: -5,
                                transition: { duration: 0.2 }
                            }}
                        >
                            <div className="pb-4">
                                <div className="relative w-full aspect-[3/2] mb-4 overflow-hidden">
                                    <motion.div
                                        whileHover={{
                                            transition: { duration: 0.3 }
                                        }}
                                    >
                                        <Image
                                            src={advice.image}
                                            alt={advice.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </motion.div>
                                </div>
                                <div className="flex-col items-center gap-2">
                                    <h3 className="text-3xl sm:text-4xl text font-medium text-center">
                                        {advice.title}
                                    </h3>
                                    <p className=" p-4 text-xl text-center">
                                        {advice.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
