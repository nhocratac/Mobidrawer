"use client";
import { login } from "@/api/authAPI";
import { useRouter } from "next/navigation";

export function useLogin() {
  const router = useRouter(); // Khởi tạo router để điều hướng
  async function handleLogin(email: string, password: string) {
    try {
      const loginResponse = await login({email,password});
      if(loginResponse) 
        router.replace("/")
    } catch (error) {
      console.error("Error login:", error);
      throw error;
    }
  }
  return { handleLogin };
}
