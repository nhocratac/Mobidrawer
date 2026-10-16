import httpRequest from "@/utils/httpRequest";

export interface OrderStatus {
  txnRef: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  plan: string;
  amountVnd: number;
  createdAt: string;
  paidAt?: string | null;
  grantedUserPlanId?: string | null;
  vnpResponseCode?: string | null;
}

const paymentsAPI = {
  // Amount is priced server-side from `plan`; the client no longer sends it.
  async createPaymentUrl(
    orderInfo: string,
    orderType: string,
    plan: string = "PRO"
  ): Promise<APITemplateResponse<string>> {
    const { data } = await httpRequest.post("/payments/create-payment-url", {
      orderInfo,
      orderType,
      plan,
    });

    return data;
  },

  // Read-only: the plan is granted by the VNPay IPN on the server; the callback page only polls this.
  async getOrderStatus(txnRef: string): Promise<APITemplateResponse<OrderStatus>> {
    const { data } = await httpRequest.get(`/payments/orders/${encodeURIComponent(txnRef)}`);
    return data;
  },

  async getPaymentInfo(paymentId: string): Promise<UserPlanInfo> {
    const { data } = await httpRequest.get(`/payments/${paymentId}`);

    return data;
  },
};

export default paymentsAPI;
