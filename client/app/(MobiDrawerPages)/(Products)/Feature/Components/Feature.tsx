'use client'

import { motion } from 'framer-motion'
import { ArrowLeftRight, ClipboardCheck, Files, History, Infinity, LayoutGrid, MousePointer2, Users } from "lucide-react"


interface Feature {
    icon: React.ComponentType<{ className?: string }>
    title: string
    description: string
}

const features: Feature[] = [
    {
        icon: Infinity,
        title: "Không gian vô hạn",
        description: "Một không gian làm việc không ngừng mở rộng"
    },
    {
        icon: ArrowLeftRight,
        title: "Điều phối",
        description: "Hướng dẫn người tham gia bảng"
    },
    {
        icon: MousePointer2,
        title: "Con trỏ trực tiếp",
        description: "Con trỏ hiển thị tên của người tham gia"
    },
    {
        icon: Files,
        title: "Nhập tệp",
        description: "Hỗ trợ nhập các định dạng tệp phổ biến"
    },
    {
        icon: History,
        title: "Lịch sử bảng",
        description: "Quản lý phiên bản và chỉnh sửa"
    },
    {
        icon: Users,
        title: "Quản lý vai trò",
        description: "Kiểm soát quyền truy cập và phân quyền người dùng"
    },
    {
        icon: LayoutGrid,
        title: "Thư viện mẫu",
        description: "Bộ sưu tập các mẫu được thiết kế sẵn"
    },
    {
        icon: ClipboardCheck,
        title: "Quản lý dự án",
        description: "Tổ chức bảng, quản lý công việc và nhắc tên người dùng"
    }
]

export default function FeatureSection() {
    return (
        <section className="py-16 md:py-24 w-full">
            <div className="mx-auto w-full px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-6xl sm:text-6xl text-center mb-8 leading-tight">
                        Tối ưu hoá quy trình làm việc nhóm
                    </h2>
                    <p className="text-neutral-500 text-2xl max-w-4xl mx-auto text-center"
                        style={{ maxWidth: '800px' }}
                    >
                        Conceptboard là công cụ cộng tác được tích hợp nhiều tính năng, giúp quản lý bảng dễ dàng và cộng tác mượt mà. Trải nghiệm công cụ cộng tác của chúng tôi cho làm việc từ xa và các nhóm kết hợp!
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{
                                y: -8,
                                scale: 1.02,
                                transition: { duration: 0.2 }
                            }}
                            className="group p-8 rounded-2xl cursor-pointer 
                                     transition-all duration-300 border border-orange-100
                                     hover:shadow-xl hover:shadow-orange-100/50"
                        >
                            <div className="bg-white p-4 rounded-xl w-16 h-16 flex items-center justify-center
                                          mb-6 group-hover:bg-orange-500 transition-colors duration-300">
                                <feature.icon className="h-8 w-8 text-orange-500 group-hover:text-white 
                                                      transition-colors duration-300" />
                            </div>
                            <h3 className="text-2xl mb-4 text-gray-800 group-hover:text-orange-600 
                                         transition-colors duration-300">
                                {feature.title}
                            </h3>
                            <p className="text-lg text-gray-600 leading-relaxed group-hover:text-gray-700
                                        transition-colors duration-300">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
