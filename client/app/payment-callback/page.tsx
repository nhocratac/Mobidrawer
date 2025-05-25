"use client";

import paymentsAPI from "@/api/paymentsAPI";
import { Button } from "@/components/ui/button";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { Frown, Laugh, Loader } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const PaymentCallback = () => {
  return (
    <Suspense fallback={<div className="text-white text-xl">Đang tải...</div>}>
      <PaymentCallbackContent />
    </Suspense>
  )
}
const PaymentCallbackContent = () => {
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const { setUser } = useTokenStore();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    console.log(params);
    setIsLoading(true);
    paymentsAPI
      .validPayment(params)
      .then((res) => {
        setUser(res);
        setTimeout(() => {
          window.location.href = "/user/dashboard";
        }, 1000);
      })
      .catch((err) => {
        console.log("err", err);
        setIsError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center h-svh">
      <div className="flex flex-col items-center justify-center gap-5">
        {isLoading ? (
          <>
            <Loader className="animate-spin" />
            <p className="text-xl">
              Vui lòng chờ trong giây lát. Hệ thống đang xử lí thanh toán!
            </p>
          </>
        ) : (
          <>
            {isError ? (
              <>
                <Frown className="text-red-500" size={45} />
                <p className="text-red-500 text-3xl">
                  Xảy ra lỗi trong quá trình thanh toán, Vui lòng thử lại. Hoặc
                  liên hệ với chúng tôi để được hỗ trợ!
                </p>
                <Link href={"/"}>
                  <Button className="w-full max-w-[300px] mt-5 text-xl">
                    Về lại trang chủ
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Laugh className="text-green-500" size={45} />
                <p className="text-green-500 text-3xl">
                  Thanh toán thành công!
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
