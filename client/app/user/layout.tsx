"use client";
import { refreshAccessToken } from "@/api/authAPI"; // 🆕 Hàm gọi API refresh token
import { useStompStore } from "@/lib/Zustand/socketStore";
import useTokenStore, { isTokenExpired } from "@/lib/Zustand/tokenStore";
import { useEffect } from "react";

export default function UserLayout({
    children,
}: { children: React.ReactNode }) {
    useEffect(() => {
        const connectSocket = async () => {
          let token = useTokenStore.getState().token;
    
          if (!token || isTokenExpired(token)) {
            console.log("🔄 Token hết hạn, đang làm mới...");
            token = await refreshAccessToken();
            if (!token) {
              console.error("❌ Không thể refresh token, không kết nối WebSocket.");
              return;
            }
            useTokenStore.getState().setToken(token); // Cập nhật token mới vào Zustand
          }
    
          console.log("✅ Kết nối WebSocket với token hợp lệ!");
          useStompStore.getState().connect(token); // Truyền token khi kết nối WebSocket
        };
    
        connectSocket(); // Gọi hàm kiểm tra token trước khi kết nối
    
        return () => {
          console.log("🔌 Ngắt kết nối WebSocket");
          useStompStore.getState().disconnect();
        };
      }, []);
    return (
        <>
            {children}
        </>
    )
}
