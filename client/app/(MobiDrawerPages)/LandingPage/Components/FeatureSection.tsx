'use client'

import { motion } from 'framer-motion'
import { Users, Zap, Shield } from 'lucide-react'
import Image from 'next/image'
import feature from '@/assets/LandingPageImages/feature.png'

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
}

const features = [
    {
        icon: Zap,
        title: 'Cộng tác thời gian thực',
        description: 'Làm việc cùng nhau một cách mượt mà trong thời gian thực, bất kể đội ngũ của bạn ở đâu.'
    },
    {
        icon: Users,
        title: 'Quản lý đội ngũ',
        description: 'Dễ dàng quản lý vai trò, quyền hạn và cấu trúc đội ngũ để tối ưu hóa quy trình làm việc.'
    },
    {
        icon: Shield,
        title: 'Bảo mật nâng cao',
        description: 'Bảo vệ dữ liệu của bạn với các tính năng bảo mật và tuân thủ tiêu chuẩn cấp doanh nghiệp.'
    },
]

export default function FeatureSection() {
    return (
        <section id="features" className="bg-white py-20">
            <div className="container mx-auto px-4 md:px-8 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-6xl sm:text-6xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '800px', whiteSpace: 'pre-wrap' }}>
                        Tính năng chính
                    </h2>
                    <p className="text-neutral-500 text-2xl max-w-4xl mx-auto">
                        Khám phá những công cụ mạnh mẽ được thiết kế để nâng cao năng suất và khả năng hợp tác của đội ngũ bạn.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="w-full flex justify-center mb-20 bg-yellow-300 pt-12 rounded-3xl">
                        <div className="mb-12 px-8">
                            <Image
                                src={feature}
                                alt="Features Overview"
                                width={768}
                                height={499}
                                className="rounded-2xl w-full h-full object-cover shadow-lg"
                                priority
                            />
                        </div>
                    </div>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            variants={fadeInUp}
                            viewport={{ once: false }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            whileHover={{
                                y: -8,
                                scale: 1.02,
                                transition: { duration: 0.2 }
                            }}
                            className="group p-8 rounded-2xl 
                                     cursor-pointer transition-all duration-300 border border-orange-100
                                     hover:shadow-xl hover:shadow-orange-100/50"
                        >
                            <div className="bg-white p-4 rounded-xl w-16 h-16 flex items-center justify-center
                                          mb-6 group-hover:bg-orange-500 transition-colors duration-300">
                                <feature.icon className="h-8 w-8 text-orange-500 group-hover:text-white transition-colors duration-300" />
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