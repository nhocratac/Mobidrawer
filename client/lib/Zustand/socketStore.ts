"use client";
import { create } from "zustand";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface StompState {
  client: Client | null;
  connect: () => void;
  disconnect: () => void;
}

export const useStompStore = create<StompState>((set, get) => ({
  client: null,
  connect: () => {
    if (get().client) return; // Nếu đã có client, không tạo lại

    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000, // Tự động kết nối lại
      onConnect: () => {
        console.log("✅ WebSocket Connected");
      },
      onStompError: (frame) => {
        console.error("❌ STOMP Error:", frame.headers["message"]);
      },
    });

    stompClient.activate();
    set({ client: stompClient });
  },
  disconnect: () => {
    const client = get().client;
    if (client) {
      client.deactivate();
      set({ client: null });
      console.log("❌ WebSocket Disconnected");
    }
  },
}));
