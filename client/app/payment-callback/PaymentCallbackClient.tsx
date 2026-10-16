"use client";

import paymentsAPI from "@/api/paymentsAPI";
import userApi from "@/api/userApi";
import { Button } from "@/components/ui/button";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { pollOrder, type PollOutcome } from "@/lib/payment/pollOrder";
import { Frown, Laugh, Loader, Clock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PaymentCallback = () => {
  const searchParams = useSearchParams();
  const txnRef = searchParams.get("vnp_TxnRef");
  const urlResponseCode = searchParams.get("vnp_ResponseCode");
  const [outcome, setOutcome] = useState<PollOutcome | null>(null);
  const { user, setUser } = useTokenStore();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!txnRef) { setOutcome({ kind: "error", error: "missing vnp_TxnRef" }); return; }
    const controller = new AbortController();
    pollOrder(() => paymentsAPI.getOrderStatus(txnRef).then((r) => r.data), {
      intervalMs: 2000, timeoutMs: 60000, urlResponseCode, signal: controller.signal,
    }).then(async (r) => {
      if (r.kind === "aborted" || controller.signal.aborted) return;
      if (r.kind === "paid") {
        if (user?.id) {
          try { setUser(await userApi.getUserDetailById(user.id)); } catch { /* dashboard reloads the user anyway */ }
          if (controller.signal.aborted) return;
        }
        redirectTimer.current = setTimeout(() => { window.location.href = "/user/dashboard"; }, 1000);
      }
      setOutcome(r);
    });
    return () => {
      controller.abort();
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = () => {
    if (!outcome) return (<><Loader className="animate-spin" /><p className="text-xl">Đang chờ VNPay xác nhận thanh toán...</p></>);
    switch (outcome.kind) {
      case "paid":
        return (<><Laugh className="text-green-500" size={45} /><p className="text-green-500 text-3xl">Thanh toán thành công!</p></>);
      case "timeout":
        return (<>
          <Clock className="text-yellow-500" size={45} />
          <p className="text-yellow-600 text-2xl text-center">Đang chờ VNPay xác nhận. Gói của bạn sẽ được kích hoạt tự động trong ít phút; vui lòng kiểm tra lại sau.</p>
          <Link href="/user/dashboard"><Button className="w-full max-w-[300px] mt-5 text-xl">Về dashboard</Button></Link>
        </>);
      default:
        return (<>
          <Frown className="text-red-500" size={45} />
          <p className="text-red-500 text-3xl text-center">Thanh toán không thành công hoặc đã bị huỷ. Vui lòng thử lại hoặc liên hệ với chúng tôi để được hỗ trợ!</p>
          <Link href="/"><Button className="w-full max-w-[300px] mt-5 text-xl">Về lại trang chủ</Button></Link>
        </>);
    }
  };

  return (
    <div className="flex items-center justify-center h-svh">
      <div className="flex flex-col items-center justify-center gap-5 px-4">{body()}</div>
    </div>
  );
};

export default PaymentCallback;
