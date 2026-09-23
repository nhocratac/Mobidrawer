"use client";
import { useStompStore } from "@/lib/Zustand/socketStore";
import { useEffect } from "react";

export default function UserLayout({
    children,
}: { children: React.ReactNode }) {
    useEffect(() => {
        // Token được lấy/refresh trong beforeConnect của socketStore (mỗi lần connect/reconnect)
        useStompStore.getState().connect();

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
