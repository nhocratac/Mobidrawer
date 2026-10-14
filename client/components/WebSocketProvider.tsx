"use client";

import { useEffect } from "react";
import { useStompStore } from "@/lib/Zustand/socketStore";
import useTokenStore from "@/lib/Zustand/tokenStore";
import { refreshAccessToken } from "@/api/authAPI"; // 🆕 Hàm gọi API refresh token
import { isTokenExpired } from "@/lib/Zustand/tokenStore";

export default function WebSocketProvider() {
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
      useStompStore.getState().connect(); // Token được gửi qua header CONNECT trong socketStore
    };

    connectSocket(); // Gọi hàm kiểm tra token trước khi kết nối

    return () => {
      console.log("🔌 Ngắt kết nối WebSocket");
      useStompStore.getState().disconnect();
    };
  }, []);

  return null; // ✅ Không cần render UI, chỉ dùng để kết nối WebSocket
}
