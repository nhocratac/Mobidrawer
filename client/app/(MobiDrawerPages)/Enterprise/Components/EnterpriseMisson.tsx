'use client'

import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import Image from 'next/image'
import misson from '@/assets/TeamImages/misson.png'
import { Input } from "@/components/ui/input"

export default function EnterpriseMisson() {
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
                        className="text-4xl sm:text-6xl lg:text-6xl text-center tracking-wide mt-6 lg:mt-20"
                        style={{ maxWidth: '820px', lineHeight: '1.2' }}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.6 }}
                    >
                        Sứ mệnh của chúng tôi là giúp các đội ngũ sáng tạo nên những điều lớn lao tiếp theo                   </motion.h1>
                </motion.div>
            </div>
        
                <div className="container mx-auto mt-10 flex flex-col lg:flex-row items-center lg:items-start">

                    <div className="lg:w-1/2 ml-20 pt-20">
                        <h2 className="text-5xl leading-relaxed ">Khởi nguồn của MobiDrawer</h2>
                        <p className="text-2xl text-gray-900 mt-8"
                            style={{ maxWidth: '400px', lineHeight: '1.6' }}>
                            Năm 2024, sau nhiều năm làm việc trong ngành công nghệ, chúng tôi nhận ra rằng việc làm việc từ xa không chỉ là một xu hướng mà còn là một cơ hội để tạo ra một môi trường làm việc tốt hơn cho mọi người. Đó là lý do tại sao chúng tôi đã tạo ra MobiDrawer, một nền tảng làm việc từ xa giúp các đội nhóm có thể làm việc cùng nhau một cách hiệu quả hơn.
                            Hiện nay, hơn 80 triệu người dùng tại 200.000 tổ chức, bao gồm Nike, IKEA, Deloitte, WPP, và Cisco, dựa vào MobiDrawer để cải thiện sự hợp tác trong phát triển sản phẩm, rút ngắn thời gian đưa sản phẩm ra thị trường, và đảm bảo rằng các sản phẩm và dịch vụ mới đáp ứng nhu cầu của khách hàng.
                            Không gian làm việc trực quan của MobiDawer giúp các đội ngũ phân tán cùng nhau xây dựng chiến lược, thiết kế sản phẩm và dịch vụ, và quản lý quy trình xuyên suốt toàn bộ vòng đời đổi mới.
                        </p>
                    </div>
                    <div className="lg:w-1/2 p-4 mr-20 mb-20">
                        <Image src={misson} alt="About Us" />
                    </div>
                </div>

        </div>
    )
}