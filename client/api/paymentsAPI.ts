import httpRequest from "@/utils/httpRequest";

const paymentsAPI = {
  async createPaymentUrl(
    amount: number,
    orderInfo: string,
    orderType: string,
    plan: string = "PRO"
  ): Promise<APITemplateResponse<string>> {
    const { data } = await httpRequest.post("/payments/create-payment-url", {
      amount,
      orderInfo,
      orderType,
      plan
    });

    return data;
  },

  async validPayment(paymentInfo: any): Promise<User> {
    const { data } = await httpRequest.get(
      "/payments/valid-payment",
      {
        params: paymentInfo
      }
    );

    return data;
  },
};

export default paymentsAPI;
