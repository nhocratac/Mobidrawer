import axios from "axios";
import { refreshAccessToken } from "@/api/authAPI";
import useTokenStore from "@/lib/Zustand/tokenStore";
import env from "@/utils/environment";

const NEXT_PUBLIC_MODE_ENV = env.NEXT_PUBLIC_MODE_ENV;
const API_URL =
  NEXT_PUBLIC_MODE_ENV === "PRODUCTION"
    ? env.NEXT_PUBLIC_BACKEND_URL
    : "http://localhost:8080/api/v1";

const httpRequest = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Để gửi cookie refreshToken
  headers: {
    "Content-Type": "application/json",
  },
});

enum TokenErrorType {
  EXPIRED = "EXPIRED",
  INVALID = "INVALID",
  NOPROVIDED = "NOPROVIDED",
}

// Biến để tránh nhiều requests refresh token cùng lúc
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Hàm để thêm callbacks vào hàng đợi
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Hàm để thực thi tất cả callbacks sau khi refresh token thành công
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// ✅ Thêm accessToken vào headers trước mỗi request
httpRequest.interceptors.request.use(async (config) => {
  if (
    config.url?.includes("/auth/login") ||
    config.url?.includes("/auth/register") ||
    config.url?.includes("/auth/verify-register") ||
    config.url?.includes("/auth/refresh") ||
    (config.url?.includes("/comments") && config.method === "get")
  ) {
    return config;
  }

  const accessToken = useTokenStore.getState().token; // Lấy từ Zustand
  config.headers.Authorization = `Bearer ${accessToken}`;

  return config;
});

// ✅ Tự động refresh token nếu gặp lỗi 401
httpRequest.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      return Promise.reject(error); // Lỗi mạng hoặc lỗi không có response
    }

    const {
      status,
      config,
      data: { errorType },
    } = error.response;

    if (config.url?.includes("/auth/refresh")) {
      useTokenStore.getState().clearToken();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      [
        TokenErrorType.INVALID,
        TokenErrorType.NOPROVIDED,
        TokenErrorType.EXPIRED,
      ].includes(errorType)
    ) {
      console.log("Token expired, refreshing...", isRefreshing);
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            config.headers["Authorization"] = `Bearer ${token}`;
            resolve(httpRequest(config));
          });
        });
      }

      isRefreshing = true;
      try {
        const newAccessToken = await refreshAccessToken();
        useTokenStore.getState().setToken(newAccessToken);

        onRefreshed(newAccessToken);
        config.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return httpRequest(config);
      } catch (error) {
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default httpRequest;
