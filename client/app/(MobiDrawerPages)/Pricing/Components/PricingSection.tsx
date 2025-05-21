"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import useTokenStore from "@/lib/Zustand/tokenStore";
import paymentsAPI from "@/api/paymentsAPI";
import { useToast } from "@/hooks/use-toast";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const plans = [
  {
    name: "Miễn phí",
    price: "0 VNĐ",
    amount: 0,
    features: [
      "Không gian làm việc duy nhất với 3 bảng có thể chỉnh sửa",
      "Ghi lại và chia sẻ 5 Talktrack để cung cấp hướng dẫn sử dụng bảng video tương tác",
      "Bắt đầu nhanh chóng và thông minh với thư viện hơn 3000 mẫu MobiDrawer và mẫu do cộng đồng tạo ra",
      "Kết nối các phương thức làm việc hiện có tại MobiDrawer với hơn 100 ứng dụng và tích hợp như Zoom, Slack, Google Drive và Sketch",
      "Giới hạn chỉ 5 thành viên trong một dự án",
    ],
  },
  {
    name: "Pro",
    price: "400.000 VNĐ",
    amount: 400000,
    features: [
      "Không gian làm việc duy nhất với số lượng bảng không giới hạn",
      "Ghi lại và chia sẻ Talktracks không giới hạn để cung cấp hướng dẫn sử dụng bảng video tương tác",
      "Khôi phục nội dung bị mất và các phiên bản nội dung với lịch sử phiên bản bảng",
      "Tổ chức các cuộc họp hấp dẫn với bộ đếm thời gian, bỏ phiếu, trò chuyện video, ứng dụng ước tính, chế độ riêng tư và nhiều hơn nữa",
      "Duy trì tính nhất quán ở quy mô lớn với các mẫu tùy chỉnh và Brand Center",
      "Không giới hạn thành viên trong một dự án",
    ],
  },
  // { name: 'Doanh nghiệp', price: 'Giá tuỳ chỉnh', features: ['Scale MobiDrawer không có rủi ro với chương trình cấp phép linh hoạt của chúng tôi', 'Đơn giản hóa các tác vụ quản trị với SCIM , quản lý yêu cầu, phân quyền vai trò quản trị, nhóm thanh toán và nhiều hơn nữa', 'Quản lý tài khoản tập trung và thông tin chi tiết để áp dụng và sử dụng', 'Đảm bảo bảo mật cấp doanh nghiệp với SSO, kiểm soát tên miền, phân loại dữ liệu, 2FA và nhiều hơn nữa', 'Tham gia Chương trình thành công của khách hàng MobiDrawer, hỗ trợ cao cấp 24/7 và SLA được đảm bảo'] },
];

export default function PricingSection() {
  const { user } = useTokenStore();
  const { toast } = useToast();

  function determinePlanText(planName: string): string | undefined {
    if (!user) return "Bắt đầu ngay";

    if (planName === "Miễn phí") {
      if (user.plan === null || user?.plan === "FREE") {
        return "Gói hiện tại của bạn";
      } else if (user?.plan === "PRO") {
        return "Quay lại gói miễn phí";
      }
    } else if (planName === "Pro") {
      if (user.plan === null || user?.plan === "FREE") {
        return "Nâng cấp lên gói Pro";
      } else if (user?.plan === "PRO") {
        return "Gói hiện tại của bạn";
      }
    } else {
      return "Liên hệ với chúng tôi";
    }
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 md:px-8 lg:px-12">
        <motion.h2
          className="text-xl md:text-6xl mb-4 text-center "
          variants={fadeInUp}
        >
          Giá cả
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 py-20">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="border rounded-3xl p-20 flex flex-col bg-white"
            >
              <h3 className="text-6xl mb-4">{plan.name}</h3>
              <p className="text-5xl my-6">
                {plan.price}
                <span className="text-2xl font-normal">/tháng</span>
              </p>
              <ul className="mb-6 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center mb-2 text-xl"
                  >
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-black text-white hover:bg-black/80 text-xl py-6"
                onClick={() => {
                  if (!user) return;

                  if (
                    plan.name === "Pro" &&
                    (!user?.plan || user?.plan === "FREE")
                  ) {
                    paymentsAPI
                      .createPaymentUrl(
                        plan.amount,
                        `User với ID ${user.id} yêu cầu nâng cấp lên gói Pro`,
                        "other"
                      )
                      .then((res) => {
                        window.location.href = res.data;
                      })
                      .catch((err) => {
                        console.log("err", err);
                        toast({
                          title: "Có lỗi xảy ra",
                          description: "Vui lòng thử lại sau",
                          variant: "destructive",
                        });
                      });
                  }
                }}
                disabled={
                  (plan.name === "Pro" && user?.plan === "PRO") ||
                  (plan.name === "Miễn phí" &&
                    (!user?.plan || user?.plan === "FREE"))
                }
              >
                {determinePlanText(plan.name)}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
