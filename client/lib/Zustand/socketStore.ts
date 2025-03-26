import { create } from "zustand";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface StompState {
  client: Client | null;
  sessionId: string | null;
  isConnected: boolean; // 🆕 Thêm trạng thái kết nối
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useStompStore = create<StompState>((set, get) => ({
  client: null,
  isConnected: false, // 🆕 Mặc định chưa kết nối
  sessionId: null,
  connect: (token) => {
    if (!token) {
      console.error("❌ Không có token, không thể kết nối WebSocket!");
      return;
    }

    console.log("🔗 Đang kết nối WebSocket...");

    const socket = new SockJS(`http://localhost:8080/ws?token=${token}`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("✅ WebSocket connected!");
        stompClient.subscribe("/user/queue/session", (message) => {
          const payload = JSON.parse(message.body);
          set({ sessionId: payload.sessionId });
          console.log("Session ID received:", payload.sessionId);
        });
        stompClient.publish({
          destination: "/app/connect",
          body: JSON.stringify({}),
        });
        set({ isConnected: true }); // 🆕 Cập nhật trạng thái khi kết nối thành công
      },
      onStompError: (frame) => {
        console.error("❌ WebSocket error:", frame.headers["message"]);
      },
      onWebSocketClose: () => {
        console.warn("⚠️ WebSocket disconnected!");
        set({ isConnected: false }); // 🆕 Đặt lại trạng thái khi mất kết nối
      },
    });

    stompClient.activate();
    set({ client: stompClient });
  },

  disconnect: () => {
    const stompClient = get().client;
    if (stompClient) {
      stompClient.deactivate();
      set({ client: null, isConnected: false }); // 🆕 Đặt lại trạng thái khi disconnect
    }
  },
}));
