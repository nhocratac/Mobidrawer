"use client";

import { Loader } from "lucide-react";
import { Suspense } from "react";
import PaymentCallbackClient from "./PaymentCallbackClient";

const PaymentCallbackPage = () => (
  <Suspense fallback={<Loader className="animate-spin" size={50} />}>
    <PaymentCallbackClient />
  </Suspense>
);

export default PaymentCallbackPage;
