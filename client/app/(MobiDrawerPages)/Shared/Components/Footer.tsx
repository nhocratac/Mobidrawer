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
                            <li><Link href="#" className="text-gray-300 hover:text-white">Bảng trắng trực tuyến</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Ứng dụng và Tích hợp</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Mẫu</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Nền tảng nhà phát triển Miro</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">MobiDrawer trên các thiết bị</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Enterprise Guard</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Khả năng truy cập</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Nhật ký thay đổi</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Giải pháp</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="#" className="text-gray-300 hover:text-white">Cuộc họp và Hội thảo</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Động não và Tư duy sáng tạo</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Thực hành Agile</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Sơ đồ</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Nghiên cứu và Thiết kế</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Chiến lược và Lập kế hoạch</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Bản đồ tư duy</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Bản đồ ý tưởng</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Ghi chú dán trực tuyến</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Công cụ tạo lưu đồ</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Khung lưới</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Tài nguyên</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="#" className="text-gray-300 hover:text-white">Học viện MobiDrawer</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Trung tâm trợ giúp</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Blog</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Trạng thái</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Cộng đồng MobiDrawer</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Sự kiện MobiDrawer</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Công ty</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="#" className="text-gray-300 hover:text-white">Về chúng tôi</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Nghề nghiệp</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Tin tức về MobiDrawer</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Câu chuyện khách hàng</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-4xl">Gói và Giá</h3>
                        <ul className="space-y-2 text-lg">
                            <li><Link href="#" className="text-gray-300 hover:text-white">Giá cả</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Doanh nghiệp</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Tập đoàn</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Tư vấn viên</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Giáo dục</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Khởi nghiệp</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Tổ chức phi lợi nhuận</Link></li>
                            <li><Link href="#" className="text-gray-300 hover:text-white">Liên hệ bán hàng</Link></li>
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

