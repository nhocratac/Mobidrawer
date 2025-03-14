"use client";
import useTokenStore from "@/lib/Zustand/tokenStore";
import httpRequest from "@/utils/httpRequest";
import { useRouter } from "next/navigation";

export function useLogin() {
  const router = useRouter(); // Khởi tạo router để điều hướng
  const {setToken}= useTokenStore()
  async function handleLogin(email: string, password: string) {
    try {
      const response = await httpRequest.post(
        "/auth/login",
        {
          email,
          password,
        },
        {
          credentials: "include",
        }
      );
      if (response.status !== 200) throw new Error("lỗi login");
      console.log("Login success:", response);
      // routing to /
      const accessToken = response.headers.get("Authorization")?.split("Bearer ")[1];
      if (!accessToken) throw new Error("No access token received");
      setToken(accessToken);
      router.push("/");
      return response;
    } catch (error) {
      console.error("Error login:", error);
      throw error;
    }
  }
  return { handleLogin };
}
