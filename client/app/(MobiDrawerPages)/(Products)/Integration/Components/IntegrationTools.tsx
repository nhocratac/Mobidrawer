'use client'

import IntegrationIcons from "@/assets/IntegrationIcon"
import { Button } from "@/components/ui/button"
import { motion, useInView } from "framer-motion"
import Image, { StaticImageData } from "next/image"
import { useRef } from "react"

interface Tool {
    name: string
    description: string
    logo: StaticImageData | string | undefined;
}

const tools: Tool[] = [
    {
        name: "Microsoft Teams",
        description: "Kết nối các nhóm xung quanh bảng MobiDrawer trong các cuộc họp Teams.",
        logo: IntegrationIcons.find(icon => icon.name === 'Microsoft Teams')?.icon
    },
    {
        name: "Jira",
        description: "Tăng cường hoạt động lập kế hoạch Agile với các tác vụ Jira tích hợp.",
        logo: IntegrationIcons.find(icon => icon.name === 'Jira')?.icon
    },
    {
        name: "Slack",
        description: "Giữ tất cả thông báo ở một nơi và theo dõi hoạt động MobiDrawer theo thời gian thực.",
        logo: IntegrationIcons.find(icon => icon.name === 'Slack')?.icon
    },
    {
        name: "Confluence",
        description: "Cung cấp thêm ngữ cảnh cho tài liệu với canvas MobiDrawer được nhúng trực tiếp.",
        logo: IntegrationIcons.find(icon => icon.name === 'Confluence')?.icon
    },
    {
        name: "AWS",
        description: "Ước tính chi phí cơ sở hạ tầng đám mây và lập kế hoạch chi tiêu.",
        logo: IntegrationIcons.find(icon => icon.name === 'AWS')?.icon
    },
    {
        name: "GitHub",
        description: "Chuyển đổi ý tưởng thành các kho lưu trữ và dự án GitHub có thể thực hiện.",
        logo: IntegrationIcons.find(icon => icon.name === 'Github')?.icon
    },
    {
        name: "Azure DevOps",
        description: "Trực quan hóa tác vụ và quản lý dự án, tất cả với đồng bộ hóa thời gian thực.",
        logo: IntegrationIcons.find(icon => icon.name === 'Azure DevOps')?.icon
    },
    {
        name: "Asana",
        description: "Kết hợp ngữ cảnh dự án và tiến độ với các tác vụ Asana được nhúng.",
        logo: IntegrationIcons.find(icon => icon.name === 'Asana')?.icon
    },
    {
        name: "ServiceNow",
        description: "Tập trung hóa quản lý yêu cầu và hợp lý hóa quy trình bảo mật.",
        logo: IntegrationIcons.find(icon => icon.name === 'ServiceNow')?.icon
    }
]

export default function ToolsIntegration() {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: false, margin: "-100px" })

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 30 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5
            }
        }
    }

    return (
        <section ref={ref} className="pb-24">
            <div className="container px-4 md:px-6">
                <motion.div
                    className="text-center space-y-4 mb-12 md:mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="mt-20 text-4xl sm:text-5xl text-center text mb-8 mx-auto px-4 leading-tight">
                        Kết nối công cụ của bạn
                    </h2>
                    <p className="text-neutral-500 text-2xl max-w-4xl mx-auto mb-12">
                        MobiDrawer hoạt động liền mạch với các công cụ mà nhóm của bạn sử dụng trong công việc hàng ngày.
                    </p>
                </motion.div>
                <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    variants={container}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                >
                    {tools.map((tool) => (
                        <motion.div
                            key={tool.name}
                            className="rounded-2xl border bg-white p-6"
                            variants={item}
                        >
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4">
                                    <div className="w-[52px] h-[52px] relative border border-neutral-200 rounded-2xl">
                                        {tool.logo && <Image
                                            src={tool.logo}
                                            alt={`${tool.name} logo`}
                                            width={52}
                                            height={52}
                                            className="object-contain"
                                        />}
                                    </div>
                                    <h3 className="text-3xl sm:text-3xl text-left leading-tight my-auto">
                                        {tool.name}
                                    </h3>
                                </div>
                                <p className="text-lg text-gray-600 leading-relaxed group-hover:text-gray-700">
                                    {tool.description}
                                </p>
                                <a href="">
                                    <Button className="bg-black text-white hover:bg-black/80 text-md mt-6">
                                        Tìm hiểu thêm
                                    </Button>
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}

