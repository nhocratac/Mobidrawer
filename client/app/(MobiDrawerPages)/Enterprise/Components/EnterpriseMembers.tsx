import member1 from "@/assets/Members/member1.png"
import member2 from "@/assets/Members/member2.png"
import member3 from "@/assets/Members/member3.png"
import { motion, useAnimation } from 'framer-motion'
import { Dribbble, Linkedin, Twitter } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

export default function TeamSection() {
    const team = [
        {
            name: "Mai Đức Thịnh",
            role: "CEO & Co-Founder",
            description: "Với 9 kinh nghiệm trong lĩnh vực IT, chúng tôi tự hào là một trong những đơn vị hàng đầu tại Việt Nam.",
            image: member1,
        },
        {
            name: "Nguyễn Việt Thắng",
            role: "Head of Development",
            description: "Tôi đam mê khoa học máy tính và luôn tìm kiếm những cơ hội để học hỏi và phát triển.",
            image: member2,
        },
        {
            name: "Lưu Minh Tân",
            role: "Head of Customer Support",
            description: "Tôi đam mê công nghệ và luôn tìm kiếm những cơ hội để học hỏi và phát triển các sản phẩm mới.",
            image: member3,
        },
    ]

    const controls = useAnimation();
    const [ref, inView] = useInView({ triggerOnce: false });

    useEffect(() => {
        if (inView) {
            controls.start('visible');
        } else {
            controls.start('hidden');
        }
    }, [controls, inView]);

    return (

        <motion.section 
            ref={ref}
            className="py-16 px-4"
            initial="hidden"
            animate={controls}
            variants={{
                hidden: { opacity: 0, y: 50 },
                visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 1 }}
        >
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <p className="text-3xl leading-tight mb-2">Team</p>
                    <h2 className="text-6xl  mb-4">Giới thiệu chung về Đội ngũ</h2>
                    <p className="text-xl text-muted-foreground">Các thành viên chủ chốt</p>
                </div>
                <div className="grid md:grid-cols-3 gap-12 mt-20">
                    {team.map((member) => (
                        <motion.div 
                            key={member.name} 
                            className="text-center"
                        >
                            <div className="mb-4 relative mx-auto ml-60">
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    width={265}
                                    height={104}
                                    className="rounded-lg mx-auto object-cover"
                                />
                            </div>
                            <h3 className="text-4xl leading-tight mb-1">{member.name}</h3>
                            <p className="text-xl text-muted-foreground mb-3">{member.role}</p>
                            <p className="text-lg mb-4">{member.description}</p>
                            <div className="flex justify-center gap-4">
                                <Link href="#" className="text-muted-foreground hover:text-primary">
                                    <Linkedin className="w-5 h-5" />
                                </Link>
                                <Link href="#" className="text-muted-foreground hover:text-primary">
                                    <Twitter className="w-5 h-5" />
                                </Link>
                                <Link href="#" className="text-muted-foreground hover:text-primary">
                                    <Dribbble className="w-5 h-5" />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    )
}

