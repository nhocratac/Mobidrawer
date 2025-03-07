"use client"; // 🚀 Chỉ client mới cần WebSocket

import { useStompStore } from "@/lib/Zustand/socketStore";
import { useEffect } from "react";

export default function WebSocketProvider() {
  useEffect(() => {
    useStompStore.getState().connect(); // Kết nối WebSocket khi app chạy

    return () => {
      useStompStore.getState().disconnect(); // Ngắt kết nối khi component unmount
    };
  }, []);

  return null; // ✅ Không render UI, chỉ dùng để kết nối WebSocket
}
