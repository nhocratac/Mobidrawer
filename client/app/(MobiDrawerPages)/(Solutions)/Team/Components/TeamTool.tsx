'use client';

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import tool1 from '@/assets/TeamImages/tool1.png'
import tool2 from '@/assets/TeamImages/tool2.png'
import tool3 from '@/assets/TeamImages/tool3.png'
import tool4 from '@/assets/TeamImages/tool4.png'

export default function FeatureGrid() {
    const features = [
        {
            title: "Vẽ sơ đồ kỹ thuật, hợp tác hiệu quả",
            description: "Dù bạn đang vẽ sơ đồ mạng, UML, hay cơ sở dữ liệu, hãy tiết kiệm thời gian thiết kế thủ công và tập trung vào những gì quan trọng. Tất cả đều đồng bộ, giúp đội ngũ của bạn hiểu rõ các chủ đề phức tạp.",
            image: tool1,
            alt: "Sơ đồ kỹ thuật minh họa kết nối mạng và kiến trúc hệ thống"
        },
        {
            title: "Agile thực sự linh hoạt và hiệu quả",
            description: "Tăng tốc quy trình làm việc hàng ngày với các mẫu và tích hợp AI thông minh, giữ đội ngũ sản phẩm luôn đồng bộ và tiến bước đúng hướng. Mỗi buổi làm việc đều hiệu quả và bao hàm, từ sprint đến retro.",
            image: tool2,
            alt: "Giao diện quản lý dự án Agile với bảng tác vụ và sự hợp tác nhóm"
        },
        {
            title: "Tối ưu hóa hạ tầng đám mây hiệu quả",
            description: "Kết nối các đội ngũ đám mây của bạn để thống nhất về thiết kế và tối ưu hóa kiến trúc đám mây. Tất cả được thực hiện trên một nền tảng mượt mà, không gián đoạn.",
            image: tool3,
            alt: "Sơ đồ hạ tầng đám mây thể hiện các hệ thống phân tán"
        },
        {
            title: "Hợp tác trong các dự án phức tạp",
            description: "Từ các buổi chiến lược đến sprint thiết kế, tất cả thành viên đều có thể tương tác, đánh giá và đóng góp một cách có ý nghĩa - thúc đẩy sự sáng tạo và tăng tốc các ý tưởng chiến lược.",
            image: tool4,
            alt: "Không gian làm việc cộng tác thể hiện sự tương tác của đội ngũ"
        }
    ];



    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="container mx-auto px-4 pb-20">
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
                variants={containerVariants}
                animate="visible"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.3 }}
            >
                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        className="bg-white rounded-3xl shadow-lg overflow-hidden p-10 border border-gray-200"
                        variants={itemVariants}
                    >
                        <div className="relative h-[451px]">
                            <Image
                                src={feature.image}
                                alt={feature.alt}
                                layout="fill"
                                objectFit="cover"
                                className="rounded-tl-3xl rounded-tr-3xl shadow-lg"
                            />
                        </div>
                        <div className="py-5">
                            <h2 className="text-4xl sm:text-5xl text-left text leading-tight py-10">
                                {feature.title}
                            </h2>
                            <p className="text-muted-foreground text-2xl"
                                style={{ width: "90%" }}
                            >
                                {feature.description}</p>
                            <a href="">
                                <Button className="bg-black text-white hover:bg-black/80 text-2xl mt-6 py-8 px-10">
                                    Tìm hiểu thêm
                                </Button>
                            </a>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}