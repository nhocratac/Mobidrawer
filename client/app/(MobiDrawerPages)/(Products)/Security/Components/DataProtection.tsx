import Link from "next/link"
import Image from "next/image"
import { Lock, Globe, Cloud, Code } from 'lucide-react'

export default function DataProtection() {
    return (
        <div className="w-full mx-auto px-4 py-12 space-y-24 pb-40">
            {/* GDPR Section */}
            <section className="relative grid md:grid-cols-2 gap-8 items-center">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-24 h-24 bg-sky-100 rounded-full blur-2xl opacity-60" />
                    <div className="relative w-64 h-64 mx-auto">
                        <div className="absolute -right-8 top-0 w-full h-full">
                            <div className="relative w-full h-full">
                                <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-20">
                                    {[...Array(36)].map((_, i) => (
                                        <div key={i} className="w-1 h-1 rounded-full bg-red-500" />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full h-full bg-blue-500 rounded-full flex items-center justify-center border-4 border-yellow-400">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white flex flex-col items-center gap-2">
                                    <Lock className="w-12 h-12" />
                                    <div className="w-8 h-8 border-2 border-white rounded-lg flex items-center justify-center">
                                        <div className="w-4 h-4 bg-white rounded-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-full border-4 border-yellow-400 rounded-full" />
                            </div>
                            <div className="absolute inset-0">
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-4 h-4 bg-yellow-400"
                                        style={{
                                            top: '50%',
                                            left: '50%',
                                            transform: `rotate(${i * 30}deg) translate(120px) rotate(-${i * 30}deg)`,
                                            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <h2 className="text-4xl sm:text-5xl text-left leading-tight">
                        Ưu tiên hàng đầu: Bảo vệ dữ liệu

                    </h2>
                    <p className="text-lg text-muted-foreground">
Chúng tôi tuân thủ nghiêm ngặt Quy định Bảo vệ Dữ liệu Chung (GDPR). Theo pháp luật Châu Âu, chúng tôi cam kết bảo vệ các quyền và tự do cơ bản của cá nhân, đặc biệt là quyền được bảo vệ tất cả dữ liệu cá nhân.                    </p>
                    <Link
                        href="#"
                        className="text-blue-500 hover:text-blue-600 transition-colors"
                    >
                        Tìm hiểu thêm về bảo vệ dữ liệu.
                    </Link>
                </div>
            </section>

            {/* ISO Section */}
            <section className="relative grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6 md:order-1">
                    <h2 className="text-4xl sm:text-5xl text-left leading-tight">
                        Chứng nhận theo tiêu chuẩn ISO 27001
                    </h2>
                    <p className="text-lg text-muted-foreground">
Bảo mật, toàn vẹn và khả năng truy cập thông tin là cam kết của chúng tôi. Đó là lý do chúng tôi luôn đảm bảo rằng việc quản lý dữ liệu được thực hiện một cách hoàn hảo khi xử lý các thông tin nhạy cảm. Chúng tôi cung cấp bằng chứng khách quan với chứng nhận ISO 27001, khẳng định hiệu quả của hệ thống quản lý bảo mật thông tin của mình.                    </p>
                    <div className="space-y-2">
                        <Link
                            href="#"
                            className="block text-blue-500 hover:text-blue-600 transition-colors"
                        >
                            Tải chứng nhận ISO 27001.
                        </Link>
                        <Link
                            href="#"
                            className="block text-blue-500 hover:text-blue-600 transition-colors"
                        >
                            Tìm hiểu thêm về ISO 27001.
                        </Link>
                    </div>
                </div>
                <div className="relative md:order-2">
                    <div className="absolute -right-4 bottom-0 w-24 h-24 bg-sky-100 rounded-full blur-2xl opacity-60" />
                    <div className="relative w-64 h-64 mx-auto">
                        <div className="absolute -left-8 top-0 w-full h-full">
                            <div className="relative w-full h-full">
                                <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-20">
                                    {[...Array(36)].map((_, i) => (
                                        <div key={i} className="w-1 h-1 rounded-full bg-red-500" />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
                            <Globe className="w-32 h-32 text-white" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-8 bg-white rounded flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-500">ISO 27001</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Server Location Section */}
            <section className="relative grid md:grid-cols-2 gap-8 items-center">
                <div className="relative">
                    <div className="absolute -left-4 top-0 w-24 h-24 bg-sky-100 rounded-full blur-2xl opacity-60" />
                    <div className="relative w-64 h-64 mx-auto">
                        <div className="absolute -right-8 top-0 w-full h-full">
                            <div className="relative w-full h-full">
                                <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-20">
                                    {[...Array(36)].map((_, i) => (
                                        <div key={i} className="w-1 h-1 rounded-full bg-red-500" />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
                            <Cloud className="w-32 h-32 text-white" />
                        </div>
                    </div>
                </div>
                <div className="space-y-6">
                    <h2 className="text-4xl sm:text-5xl text-left leading-tight">
                        Vị trí máy chủ: Việt Nam
                    </h2>
                    <div className="space-y-4">
                        <p className="text-lg text-muted-foreground">
Để đáp ứng các tiêu chuẩn cao do chính chúng tôi đặt ra và đảm bảo bảo vệ dữ liệu tốt nhất cho người dùng, chúng tôi chỉ lưu trữ dữ liệu tại Việt Nam. Đây là cách duy nhất để đảm bảo rằng tất cả dữ liệu được bảo vệ khỏi sự truy cập trái phép của bên thứ ba. Không chỉ hôm nay, mà cả trong tương lai.                        </p>
                        <p className="text-lg text-muted-foreground">
Đối với những ai cảm thấy điều này vẫn chưa đủ an toàn, chúng tôi cung cấp tùy chọn sử dụng máy chủ riêng hoặc lưu trữ tại chỗ ngay trong trung tâm dữ liệu của bạn.                        </p>
                    </div>
                </div>
            </section>

            {/* Development Location Section */}
            <section className="relative grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6 md:order-1">
                    <h2 className="text-4xl sm:text-5xl text-left leading-tight">
                        Vị trí phát triển: Việt Nam
                    </h2>
                    <p className="text-lg text-muted-foreground">
Chúng tôi đã quyết định lựa chọn Việt Nam làm trung tâm hoạt động của mình một cách có chủ đích. Việt Nam là một quốc gia đáng tin cậy, an toàn và ổn định về mặt chính sách kinh tế. Bên cạnh đó, chúng tôi cũng ý thức rõ trách nhiệm xã hội đối với khách hàng và nhân viên của mình: chỉ những doanh nghiệp trả lương công bằng và nộp thuế lợi nhuận tại địa phương mới có thể đóng góp tích cực vào việc thúc đẩy và đại diện cho Việt Nam như một điểm đến trong tương lai của các nhà phát triển phần mềm. Thêm vào đó, cơ sở hạ tầng của Việt Nam đang phát triển mạnh mẽ và đạt được nhiều tiến bộ.                    </p>
                </div>
                <div className="relative md:order-2">
                    <div className="absolute -right-4 bottom-0 w-24 h-24 bg-sky-100 rounded-full blur-2xl opacity-60" />
                    <div className="relative w-64 h-64 mx-auto">
                        <div className="absolute -left-8 top-0 w-full h-full">
                            <div className="relative w-full h-full">
                                <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-20">
                                    {[...Array(36)].map((_, i) => (
                                        <div key={i} className="w-1 h-1 rounded-full bg-red-500" />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
                            <Code className="w-32 h-32 text-white" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

