'use client'

import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import Mesh from "@/app/(MobiDrawerPages)/LandingPage/Components/Mesh"
import SvgGrid from "@/app/(MobiDrawerPages)/LandingPage/Components/SvgGrid"
import Image from 'next/image'
import about from '@/assets/TeamImages/about.png'
import Link from 'next/link'
export default function HeroSection() {
  return (
    <div className="relative min-h-[800px]">
      <div className="absolute inset-0 pointer-events-none w-screen left-1/2 -translate-x-1/2">
        <Mesh />
        <div className="absolute inset-0">
          <SvgGrid width="100vw" height="800px" />
        </div>
      </div>


      <div className="container mx-auto">
        <motion.div
          className="flex flex-col items-center relative z-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1
            className="text-4xl sm:text-6xl lg:text-7xl text-center tracking-wide mt-6 lg:mt-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
          >
            Chào mừng đến với
            <span className="bg-gradient-to-r from-orange-500 to-red-800 text-transparent bg-clip-text">
              {" "}
              MobiDrawer Workspace
            </span>
          </motion.h1>

          <motion.h2
            className="mt-10 text-2xl text-center text-neutral-500 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Một nền tảng hợp nhất,tối ưu hóa sự phối hợp của nhóm, đưa ý tưởng thành hiện thực nhanh hơn bao giờ hết.
          </motion.h2>

          <motion.div
            className="mx-auto mt-10 mb-20 flex flex-col items-center gap-4  max-w-md"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link href="/user/dashboard">
              <Button
                className="py-8 px-4 w-full bg-blue-600 text-2xl hover:bg-blue-700 transition-colors duration-300 text-white"
              >
                Đi đến bảng điều khiển
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="flex mt-10 item-center justify-center"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="mb-12 rounded-xl border-8 border-yellow-300 bg-gray-200">
              <Image
                src={about}
                alt="Features Overview"
                width={1200}
                height={707}
                className="rounded-lg w-full h-full object-cover"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}