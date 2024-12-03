'use client'

import Image from "next/image"
import Link from "next/link"
import City from "@/assets/Offices/index"
import { motion } from "framer-motion"
import { useRef } from "react"
import { useInView } from "framer-motion"

export default function Offices() {
    const ref = useRef(null)
    const isInView = useInView(ref, {
        once: false,
        margin: "-100px",
    })

    const cities = [
        {
            title: City[0].name,
            description: "Sử dụng văn bản, tệp, hình ảnh, video và các ghi chú khác để thêm nội dung vào workspace của bạn.",
            image: City[0].image,
        },
        {
            title: City[1].name,
            description: "Sử dụng ghi chú bảng trắng để phác thảo ý tưởng của bạn.",
            image: City[1].image,
        },
        {
            title: City[2].name,
            description: "Bạn có hàng trăm mẫu được thiết kế riêng để lựa chọn.",
            image: City[2].image,
           
        },
        {
            title: City[3].name,
            description: "Tận dụng sức mạnh của brainstorming bằng cách nhóm các ý tưởng và khái niệm lại với nhau.",
            image: City[3].image,
      
        },
        {
            title: City[4].name,
            description: "Giữ các cuộc họp của bạn tập trung bằng cách làm nổi bật các phần và đồng bộ con trỏ của mọi người.",
            image: City[4].image,
         
        },
        {
            title: City[5].name,
            description: "Xuất công việc của bạn thành các tài liệu, bảng tính, hình ảnh sẵn sàng gửi đến các bên liên quan.",
            image: City[5].image,
          
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
                    Văn phòng của chúng tôi đã có mặt tại những thành phố lớn
                </motion.h2>
                <motion.div
                    className="grid gap-6 md:gap-8 lg:gap-10 md:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    {cities.map((city, index) => (
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
                                            src={city.image}
                                            alt={city.title}
                                            fill
                                            className="object-cover rounded-lg"
                                        />
                                    </motion.div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-3xl sm:text-3xl text-left text leading-tight">
                                        {city.title}
                                    </h3>
                                   
                                </div>
                            </div>                             
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
