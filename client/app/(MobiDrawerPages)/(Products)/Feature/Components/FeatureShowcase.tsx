'use client'

import Image from "next/image"
import Link from "next/link"
import ProductImages from "@/assets/ProductImages"
import { motion } from "framer-motion"
import { useRef } from "react"
import { useInView } from "framer-motion"

export default function FeaturesGrid() {
    const ref = useRef(null)
    const isInView = useInView(ref, {
        once: false,
        margin: "-100px",
        amount: 0.3
    })

    const features = [
        {
            title: "Thêm nội dung theo nhiều cách",
            description: "Sử dụng văn bản, tệp, hình ảnh, video và các ghi chú khác để thêm nội dung vào workspace của bạn.",
            image: ProductImages[0].src,
        },
        {
            title: "Tự do sáng tạo với bảng trắng",
            description: "Sử dụng ghi chú bảng trắng để phác thảo ý tưởng của bạn.",
            image: ProductImages[1].src,
        },
        {
            title: "Chọn từ hơn 250+ mẫu",
            description: "Bạn có hàng trăm mẫu được thiết kế riêng để lựa chọn.",
            image: ProductImages[2].src,
            link: {
                text: "mẫu",
                href: "#",
            },
        },
        {
            title: "Nhóm ý tưởng và nội dung trực quan",
            description: "Tận dụng sức mạnh của brainstorming bằng cách nhóm các ý tưởng và khái niệm lại với nhau.",
            image: ProductImages[3].src,
            isNew: true,
            footnote: "Chỉ khả dụng trên các gói Business và Enterprise",
        },
        {
            title: "Tập trung vào những gì quan trọng",
            description: "Giữ các cuộc họp của bạn tập trung bằng cách làm nổi bật các phần và đồng bộ con trỏ của mọi người.",
            image: ProductImages[4].src,
            isNew: true,
            footnote: "Chỉ khả dụng trên các gói Enterprise",
        },
        {
            title: "Duy trì đà phát triển",
            description: "Xuất công việc của bạn thành các tài liệu, bảng tính, hình ảnh sẵn sàng gửi đến các bên liên quan.",
            image: ProductImages[5].src,
            link: {
                text: "Xuất",
                href: "#",
            },
        },
        {
            title: "Sử dụng Mobidrawer trên mọi thiết bị",
            description: "Ứng dụng di động và máy tính bảng của Mobidrawer cho phép bạn cộng tác mọi lúc, mọi nơi.",
            image: ProductImages[6].src,
            link: {
                text: "ứng dụng di động và máy tính bảng",
                href: "#",
            },
        },
        {
            title: "Tận dụng canvas vô hạn",
            description: "Thêm phần, thay đổi kích thước mẫu của bạn và không bao giờ hết không gian.",
            image: ProductImages[7].src,
        },
        {
            title: "Dễ dàng điều hướng và phóng to",
            description: "Không bao giờ mất dấu công việc của bạn với bảng điều hướng.",
            image: ProductImages[8].src,
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
            <div className="container px-4 md:px-6">
                <motion.h2
                    className="text-6xl sm:text-6xl text-center mb-8 leading-tight mx-auto pb-12"
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 50 }
                    }
                    transition={{
                        duration: 0.5,
                        ease: "easeOut"
                    }}
                >
                    Bắt đầu thay đổi cách bạn làm việc
                </motion.h2>
                <motion.div
                    className="grid gap-6 md:gap-8 lg:gap-10 md:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="rounded-lg border bg-background p-6 hover:shadow-xl transition-all duration-300"
                            variants={item}
                            whileHover={{
                                cursor: "pointer",
                                y: -5,
                                transition: { duration: 0.2 }
                            }}
                        >
                            <div className="pb-4">
                                <div className="relative w-full aspect-[3/2] mb-4 overflow-hidden rounded-lg">
                                    <motion.div
                                        whileHover={{
                                            transition: { duration: 0.3 }
                                        }}
                                    >
                                        <Image
                                            src={feature.image}
                                            alt={feature.title}
                                            fill
                                            className="object-cover rounded-lg"
                                        />
                                    </motion.div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-3xl sm:text-3xl text-left text leading-tight">
                                        {feature.title}
                                    </h3>
                                    {feature.isNew && (
                                        <motion.span
                                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full"
                                            whileHover={{ scale: 1.1 }}
                                        >
                                            Mới!
                                        </motion.span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-muted-foreground">
                                    {feature.description.split(feature.link?.text || "").map((part, i, arr) => (
                                        <span key={i}>
                                            {part}
                                            {i < arr.length - 1 && (
                                                <Link href={feature.link?.href || "#"} className="text-blue-500 hover:underline">
                                                    {feature.link?.text}
                                                </Link>
                                            )}
                                        </span>
                                    ))}
                                </p>
                                {feature.footnote && (
                                    <p className="text-sm text-muted-foreground mt-2 italic">{feature.footnote}</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
