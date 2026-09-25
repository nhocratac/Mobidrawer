import httpRequest from "@/utils/httpRequest";

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

  async validPayment(paymentInfo: any): Promise<User> {
    const { data } = await httpRequest.get("/payments/valid-payment", {
      params: paymentInfo,
    });

    return data;
  },

  async getPaymentInfo(paymentId: string): Promise<UserPlanInfo> {
    const { data } = await httpRequest.get(`/payments/${paymentId}`);

    return data;
  },
};

export default paymentsAPI;
