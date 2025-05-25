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

