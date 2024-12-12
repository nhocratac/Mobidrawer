'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import design1 from '@/assets/UseCaseImages/DesignThinking1.png'
import design2 from '@/assets/UseCaseImages/DesignThinking2.png'
import design3 from '@/assets/UseCaseImages/DesignThinking3.png'
import { useState } from 'react'


const galleryItems = [
    {
        id: 1,
        title: "Dễ dàng quản lý",
        description: "Dù làm việc tại chỗ hay phân tán, tính năng quản lý của chúng tôi giúp bạn dẫn dắt và điều phối các buổi workshop Tư duy Thiết kế từ xa như một chuyên gia.",
    },
    {
        id: 2,
        title: "Tập trung vào trực quan",
        description: "Sử dụng công cụ phác thảo, ghi chú dán kỹ thuật số và các yếu tố trực quan để biến ý tưởng của bạn thành hiện thực trên không gian làm việc vô hạn",
    },
    {
        id: 3,
        title: "Tư duy Thiết kế ở quy mô lớn",
        description: "Xây dựng văn hóa đổi mới và thúc đẩy các giá trị Tư duy Thiết kế ở quy mô lớn với các giải pháp doanh nghiệp an toàn từ  MobiDrawer",
    }
];

const planImages = [design1, design2, design3];

export default function DesignThinking() {
    const [activeItem, setActiveItem] = useState(galleryItems[0]);
    const [activeImage, setActiveImage] = useState(planImages[0]);


    interface GalleryItem {
        id: number;
        title: string;
        description: string;
    }

    const handleItemClick = (item: GalleryItem): void => {
        setActiveItem(item);
        setActiveImage(planImages[item.id - 1]);
    };

    return (
        <section id="features" className="bg-white py-20">
            <div className="container mx-auto px-4 md:px-8 lg:px-12 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-6xl sm:text-6xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '1000px', whiteSpace: 'pre-wrap' }}>
                        Tư duy Thiết kế
                    </h2>
                    
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
                                src={activeImage}
                                alt="Features Overview"
                                width={800}
                                height={600}
                                className="rounded-2xl w-full h-full object-cover shadow-lg"
                                priority
                            />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {galleryItems.map((item) => (
                            <div
                                key={item.id}
                                className="cursor-pointer transition-all duration-200 relative overflow-hidden"
                                onClick={() => handleItemClick(item)}
                            >
                                <div className="py-6 space-y-6">
                                    <h3 className="text-5xl leading-tight">{item.title}</h3>
                                    <p className="text-muted-foreground text-2xl">{item.description}</p>
                                </div>
                                <div
                                    className={`absolute top-0 left-0 w-full h-1 bg-primary transition-all duration-300 ${activeItem.id === item.id ? 'opacity-100' : 'opacity-0'
                                        }`}
                                />
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}