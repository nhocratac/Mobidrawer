import Link from "next/link"
import { FacebookIcon, LinkedinIcon, Instagram, YoutubeIcon,} from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-black text-white w-full">
            <div className="container mx-auto max-w-[calc(100%-350px)]">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 py-20">
                    <div className="space-y-4">
                        <h3 className="text-4xl">Sản phẩm</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="/Integration" className="text-gray-300 hover:text-white">Ứng dụng và Tích hợp</Link></li>
                            <li><Link href="/Feature" className="text-gray-300 hover:text-white">Tính năng</Link></li>
                            <li><Link href="/Security" className="text-gray-300 hover:text-white">Bảo mật</Link></li>

                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Giải pháp</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="/UseCase" className="text-gray-300 hover:text-white">Trường hợp sử dụng</Link></li>
                            <li><Link href="/Team" className="text-gray-300 hover:text-white">Đội ngũ</Link></li>
                          
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Tài nguyên</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="/Blog" className="text-gray-300 hover:text-white">Blog</Link></li>
                            <li><Link href="/HelpCenter" className="text-gray-300 hover:text-white">Trung tâm trợ giúp</Link></li>
                            <li><Link href="/Events" className="text-gray-300 hover:text-white">Sự kiện MobiDrawer</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Công ty</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="/Enterprise" className="text-gray-300 hover:text-white">Về chúng tôi</Link></li>
                            <li><Link href="/Contact" className="text-gray-300 hover:text-white">Liên hệ</Link></li>
                         </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Gói và Giá</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="/Pricing" className="text-gray-300 hover:text-white">Giá cả</Link></li>
                      
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 pb-20 border-t border-gray-800 ">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <div className="flex items-center space-x-6">
                            <Link href="#" className="text-gray-300 hover:text-white">
                                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </Link>
                            <Link href="#" className="text-gray-300 hover:text-white">
                                <FacebookIcon className="h-6 w-6" />
                            </Link>
                            <Link href="#" className="text-gray-300 hover:text-white">
                                <LinkedinIcon className="h-6 w-6" />
                            </Link>
                            <Link href="#" className="text-gray-300 hover:text-white">
                                <Instagram className="h-6 w-6" />
                            </Link>
                            <Link href="#" className="text-gray-300 hover:text-white">
                                <YoutubeIcon className="h-6 w-6" />
                            </Link>
                        </div>
                      
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-lg text-white">
                        <div className="flex items-center space-x-2">
                            <span>MobiDrawer &copy; 2024</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="#" className="hover:text-white">Điều khoản sử dụng</Link>
                            <Link href="#" className="hover:text-white">Chính sách bảo mật</Link>
                            <Link href="#" className="hover:text-white">Quản lý Cookie</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

