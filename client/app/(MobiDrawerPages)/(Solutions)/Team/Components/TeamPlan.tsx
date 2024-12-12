'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import team1 from '@/assets/TeamImages/team1.png'
import team2 from '@/assets/TeamImages/team2.png'
import team3 from '@/assets/TeamImages/team3.png'
import { useState } from 'react'



const galleryItems = [
    {
        id: 1,
        title: "Trực quan hoá các hệ thống phức tạp",
        description: "Tạo sơ đồ cơ sở hạ tầng và hệ thống, tiết kiệm hàng giờ thiết kế kỹ thuật thủ công với AI tích hợp sẵn và hơn 2.000 hình dạng và mẫu. Các ứng dụng là vô tận - từ tối ưu hóa cơ sở hạ tầng đám mây của bạn, xác định các lỗ hổng trong ngăn xếp khả năng, đến việc tạo ra các mô hình mối đe dọa chi tiết, kết nối với nhau.",
    },
    {
        id: 2,
        title: "Kế hoạch, dự án và quy trình",
        description: "Kết nối các nhóm - theo thời gian thực hoặc không đồng bộ - để cộng tác, thảo luận các đánh đổi và đưa ra quyết định thông minh. Dễ dàng với các công cụ hỗ trợ AI, nhiều định dạng dữ liệu và tích hợp với các công cụ như Jira và Azure DevOps.",
    },
    {
        id: 3,
        title: "Tăng tốc phát triển",
        description: "Rút ngắn thời gian giao hàng với các khả năng được tăng cường bởi AI. Hãy nghĩ đến việc trực quan hóa dữ liệu theo thời gian thực, các hội thảo tương tác và các quy trình quản lý dự án mạnh mẽ. Bạn sẽ giải quyết các tồn đọng phát triển sản phẩm nhanh hơn khi kết hợp AI, tính tương tác và tích hợp.",
    }
];

const planImages = [team1, team2, team3];

export default function FeatureSection() {
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
            <div className="container mx-auto px-4 md:px-8 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.3 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-6xl sm:text-6xl text-center text mb-8 mx-auto px-4 leading-tight"
                        style={{ lineHeight: '1.5', maxWidth: '1000px', whiteSpace: 'pre-wrap' }}>
                        Lên kế hoạch, đồng bộ và thực thi chiến lược nhanh hơn
                    </h2>
                    <p className="text-neutral-500 text-2xl max-w-4xl mx-auto"
                        style={{ maxWidth: '590px' }}>
                        Tận dụng một nguồn thông tin duy nhất để vận hành các dự án chuyển đổi phức tạp, phát triển ứng dụng nhanh hơn và tối ưu hóa hoạt động IT.
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
                                src={activeImage}
                                alt="Features Overview"
                                width={1191}
                                height={670}
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