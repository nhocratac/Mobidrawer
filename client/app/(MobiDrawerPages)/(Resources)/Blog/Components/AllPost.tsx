'use client'

import Image from "next/image"
import AllPostImages from "@/assets/BlogImages"
import { motion } from "framer-motion"
import { useRef } from "react"
import { useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"


export default function AllPost() {
    const ref = useRef(null)
    const isInView = useInView(ref, {
        once: false,
        margin: "-100px",
    })

    const blogs = [
        {
            title: "Cách tạo lưu đồ cho lập trình: Hướng dẫn dành cho nhà phát triển",
            description: "Quy trình và hình dung luồng công việc là công cụ quan trọng cho phần mềm...",
            image: AllPostImages[0].image,
        },
        {
            title: "Vaillant Group đã thiết lập nền tảng quản lý tri thức hiệu quả và năng động như thế nào với MobiDrawer",
            description: "Vaillant Group, nhà sản xuất hàng đầu về công nghệ sưởi ấm, với lịch sử 150 năm đổi mới công nghệ...",
            image: AllPostImages[1].image,
        },
        {
            title: "Tinh thần đồng đội thực sự: cách làm việc kết hợp kết nối các nhóm",
            description: "Trong một thế giới ngày càng số hóa và toàn cầu hóa, công việc kết hợp đang dần trở thành tiêu chuẩn mới...",
            image: AllPostImages[2].image,
        },
        {
            title: "Tối ưu hóa hiệu suất ứng dụng web: Các phương pháp và công cụ",
            description: "Hiệu suất là yếu tố quan trọng trong trải nghiệm người dùng. Bài viết này sẽ hướng dẫn bạn...",
            image: AllPostImages[3].image,
        },
        {
            title: "Bảo mật trong phát triển web: Những điều cần biết",
            description: "Bảo mật là một phần không thể thiếu trong phát triển web. Hãy cùng tìm hiểu các phương pháp bảo mật...",
            image: AllPostImages[4].image,
        },
        {
            title: "Cách tạo lưu đồ cho lập trình: Hướng dẫn dành cho nhà phát triển",
            description: "Quy trình và hình dung luồng công việc là công cụ quan trọng cho phần mềm...",
            image: AllPostImages[5].image,
        },
        {
            title: "Vaillant Group đã thiết lập nền tảng quản lý tri thức hiệu quả và năng động như thế nào với MobiDrawer",
            description: "Vaillant Group, nhà sản xuất hàng đầu về công nghệ sưởi ấm, thông gió và điều hòa không khí, với lịch sử 150 năm đổi mới",
            image: AllPostImages[6].image,
        },
        {
            title: "Tinh thần đồng đội thực sự: cách làm việc kết hợp kết nối các nhóm",
            description: "Trong một thế giới ngày càng số hóa và toàn cầu hóa, công việc kết hợp đang dần trở thành tiêu chuẩn mới...",
            image: AllPostImages[7].image,
        },
        {
            title: "Tối ưu hóa hiệu suất ứng dụng web: Các phương pháp và công cụ",
            description: "Hiệu suất là yếu tố quan trọng trong trải nghiệm người dùng. Bài viết này sẽ hướng dẫn bạn...",
            image: AllPostImages[8].image,
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
        <section ref={ref} className="w-full pb-12 md:pb-24 lg:pb-32">
            <div className="container px-4 md:px-6">
                <motion.div
                    className="grid gap-6 md:gap-8 lg:gap-10 md:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    {blogs.map((blog, index) => (
                        <motion.div
                            key={index}
                            className="rounded-lg border bg-background p-6 hover:shadow-xl transition-all duration-300 relative"
                            style={{ height: '100%', minHeight: 450 }}
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
                                            src={blog.image}
                                            alt={blog.title}
                                            fill
                                            className="object-cover rounded-lg"
                                        />
                                    </motion.div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-3xl sm:text-3xl text-left text leading-tight">
                                        {blog.title}
                                    </h3>
                                </div>
                                <div className="text-xl text-left text-gray-500 py-4">
                                    {blog.description}
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 p-4">
                                <Button
                                    className="bg-black border text-white hover:bg-blue-700 text-2xl px-8 py-8"
                                >
                                    Đọc ngay
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
                <Pagination className="py-16">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious className="text-2xl" href="#" />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink className="text-2xl" href="#">1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink className="text-2xl" href="#">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink className="text-2xl" href="#">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationEllipsis/>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext className="text-2xl" href="#" />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>

            </div>
        </section>
    )
}
