import { create } from "zustand";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import env from "@/utils/environment";
import { refreshAccessToken } from "@/api/authAPI";
import useTokenStore, { decodeToken } from "@/lib/Zustand/tokenStore";

interface StompState {
  client: Client | null;
  sessionId: string | null;
  isConnected: boolean; // 🆕 Thêm trạng thái kết nối
  connect: () => void;
  disconnect: () => void;
}
const MODE_ENV = env. NEXT_PUBLIC_MODE_ENV
const SOCKET_URL = (MODE_ENV === "PRODUCTION") ? (env.NEXT_PUBLIC_BACKEND_SOCKET) : "http://localhost:8080/ws";
// Server từ chối mọi frame sau khi token của phiên hết hạn (ERROR + đóng phiên, frame bị mất).
// Chủ động kết nối lại trước hạn một khoảng này để beforeConnect lấy token mới.
const TOKEN_REFRESH_MARGIN_MS = 60_000;

let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
const clearTokenRefreshTimer = () => {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
};

// exp (epoch millis) của JWT, 0 nếu không đọc được
const getTokenExpMs = (token: string): number => {
  const exp = decodeToken(token)?.exp;
  return typeof exp === "number" ? exp * 1000 : 0;
};

export const useStompStore = create<StompState>((set, get) => ({
  client: null,
  isConnected: false, // 🆕 Mặc định chưa kết nối
  sessionId: null,
  connect: () => {
    if (get().client?.active) return; // Đã có client đang chạy, tránh kết nối trùng

    console.log("🔗 Đang kết nối WebSocket...");

    let connectedTokenExp = 0; // exp của token dùng cho lần CONNECT gần nhất

    const stompClient = new Client({
      // Tạo SockJS mới mỗi lần (re)connect; token KHÔNG nằm trên URL
      webSocketFactory: () => new SockJS(`${SOCKET_URL}`),
      reconnectDelay: 5000,
      // Chạy trước mỗi lần (re)connect: lấy token hợp lệ và gửi qua header CONNECT
      beforeConnect: async () => {
        let token = useTokenStore.getState().token;
        // Refresh cả khi token sắp hết hạn, để phiên mới không bị server cắt ngay sau đó
        if (!token || getTokenExpMs(token) - TOKEN_REFRESH_MARGIN_MS <= Date.now()) {
          console.log("🔄 Token hết hạn, đang làm mới...");
          token = await refreshAccessToken();
        }
        if (!token) {
          console.error("❌ Không thể refresh token, không kết nối WebSocket.");
          await stompClient.deactivate();
          return;
        }
        connectedTokenExp = getTokenExpMs(token);
        stompClient.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      onConnect: () => {
        console.log("✅ WebSocket connected!");
        clearTokenRefreshTimer();
        const delay = connectedTokenExp - TOKEN_REFRESH_MARGIN_MS - Date.now();
        if (delay > 0) {
          // Đóng phiên có chủ đích trước khi token hết hạn rồi kết nối lại ngay (beforeConnect refresh token)
          tokenRefreshTimer = setTimeout(async () => {
            tokenRefreshTimer = null;
            console.log("🔄 Token WebSocket sắp hết hạn, đang kết nối lại...");
            await stompClient.deactivate();
            if (get().client === stompClient) stompClient.activate(); // bỏ qua nếu đã disconnect()
          }, delay);
        }
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
        clearTokenRefreshTimer();
        set({ isConnected: false, sessionId: null }); // 🆕 Đặt lại để các effect [client, sessionId] subscribe lại
      },
    });

    stompClient.activate();
    set({ client: stompClient });
  },

  disconnect: () => {
    const stompClient = get().client;
    clearTokenRefreshTimer();
    if (stompClient) {
      stompClient.deactivate();
      set({ client: null, isConnected: false, sessionId: null }); // 🆕 Đặt lại trạng thái khi disconnect
    }
  },
}));
