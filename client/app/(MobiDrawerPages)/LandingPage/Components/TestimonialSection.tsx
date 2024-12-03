import { motion } from "framer-motion";

interface Testimonial {
    content: string
    author: string
    color: string
}

const testimonials = [
    {
        content: "MobiDrawer là công cụ lập kế hoạch dự án của chúng tôi, nơi mọi người hợp tác và mở rộng quy mô dễ dàng.",
        author: "Kurtis",
        color: "bg-pink-100"
    },
    {
        content: "MobiDrawer là môi trường động não hàng đầu của chúng tôi để phát triển sản phẩm và lập bản đồ dịch vụ.",
        author: "Dustin",
        color: "bg-blue-100"
    },
    {
        content: "MobiDrawer là nền tảng cốt lõi của toàn bộ Tổ chức Thiết kế Trải nghiệm của chúng tôi.",
        author: "Lauri",
        color: "bg-pink-200"
    },
    {
        content: "Tôi sử dụng MobiDrawer để tạo bản đồ ý tưởng và xử lý các quy trình phức tạp, rất thích khả năng phóng to thu nhỏ để xem chi tiết.",
        author: "Dimitrius",
        color: "bg-orange-100"
    },
    {
        content: "MobiDrawer là chất keo gắn kết mọi dự án chúng tôi thực hiện. Nó đảm bảo rằng đội nhóm có thể chia sẻ thông tin đa dạng.",
        author: "Diane",
        color: "bg-orange-200"
    },
    {
        content: "Tôi không thể nghĩ ra nơi nào mà MobiDrawer không phù hợp để đáp ứng nhu cầu của chúng tôi.",
        author: "Jeffrey",
        color: "bg-green-100"
    },
    {
        content: "Chúng tôi sử dụng MobiDrawer rộng rãi để lập kế hoạch sprint và tổ chức các sự kiện scrum, bao gồm cả Retrospectives.",
        author: "Johan",
        color: "bg-blue-100"
    },
    {
        content: "MobiDrawer thực sự hữu ích cho các chủ đề như cộng tác, làm việc nhóm, mối quan hệ và cấu trúc tổ chức.",
        author: "Khushboo",
        color: "bg-orange-100"
    },
    {
        content: "Các đội nhóm của chúng tôi sử dụng MobiDrawer cho nhiều dự án chiến lược. Nó đã giúp chúng tôi hợp tác hiệu quả hơn nhiều.",
        author: "Virtus",
        color: "bg-white"
    },
    {
        content: "MobiDrawer đã cải thiện đáng kể năng suất và doanh số của chúng tôi bằng cách thúc đẩy sự cộng tác và làm việc nhóm.",
        author: "Tiffany",
        color: "bg-purple-100"
    },
    {
        content: "MobiDrawer cho phép chúng tôi làm việc không đồng bộ và hiệu quả khi lập kế hoạch và cộng tác.",
        author: "Gary",
        color: "bg-purple-200"
    },
    {
        content: "Tôi sử dụng MobiDrawer để xác định hành vi của người dùng cùng với đội nhóm và hoàn thành các bản đồ quy trình.",
        author: "Jean",
        color: "bg-blue-100"
    },
    {
        content: "Bạn đã giúp chúng tôi tạo ra các chiến dịch và chiến lược năng động hơn.",
        author: "Bradford",
        color: "bg-pink-100"
    },
    {
        content: "MobiDrawer đã giúp tổ chức của tôi đổi mới và tiến lên bằng cách tạo các biểu đồ luồng và thông tin trực quan.",
        author: "Steven",
        color: "bg-blue-100"
    },
    {
        content: "Bạn đã giúp chúng tôi tạo ra các chiến dịch và chiến lược năng động hơn.",
        author: "Bradford",
        color: "bg-pink-100"
    }
];



export default function TestimonialWall() {
    const cardVariants = {
        hidden: (index: number) => ({
            opacity: 0,
            x: index % 3 === 0 ? -50 : index % 3 === 2 ? 50 : 0,
            y: 50,
        }),
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className="max-w-full mx-auto px-4 py-12 mb-20">
            <div className="relative">
                <motion.h2 
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.5 }}
                    className="text-6xl sm:text-6xl text-center text mb-12 mx-auto px-4 leading-tight"
                >
                    Mọi người nói gì về MobiDrawer
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative cursor-pointer">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            whileHover={{ scale: 1.05 }}
                            custom={index}
                            viewport={{ 
                                once: false,
                                margin: "-50px",
                                amount: "some"
                            }}
                            className={`${testimonial.color} p-6 rounded-lg shadow-lg transform hover:-translate-y-1 transition-transform duration-200 relative`}
                        >
                            <blockquote className="text-xl mb-2">
                                "{testimonial.content}"
                            </blockquote>
                            <cite className="text-lg text-gray-600 block text-right">
                                - {testimonial.author}
                            </cite>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}

