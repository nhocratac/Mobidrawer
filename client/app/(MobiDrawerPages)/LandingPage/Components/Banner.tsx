import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
export default function Banner() {
    return (
        <motion.div
            className="w-full py-5 bg-[#FFDD33]"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex items-center justify-center space-x-4">
                <a href="#" className="text-2xl font-medium hover:underline">
                    Giới thiệu các tính năng hợp tác mới của chúng tôi
                </a>
                <span className="hidden md:inline-block text-xl text-gray-700">
                    —Trải nghiệm cộng tác thời gian thực, theo dõi dự án nâng cao và tích hợp đội ngũ mượt mà.
                </span>
                <a
                    href="dashboard"
                >
                    <Button className="bg-black text-white hover:bg-black/80 text-md">Tìm hiểu thêm</Button>
                </a>
            </div>
        </motion.div>
    )
}