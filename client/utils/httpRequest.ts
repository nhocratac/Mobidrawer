import axios from "axios";
import { refreshAccessToken } from "@/api/authAPI";
import useTokenStore from "@/lib/Zustand/tokenStore";

const API_URL = "http://localhost:8080/api/v1";

const httpRequest = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Để gửi cookie refreshToken
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Thêm accessToken vào headers trước mỗi request
httpRequest.interceptors.request.use((config) => {
  if (
    config.url?.includes("/auth/login") ||
    config.url?.includes("/auth/register")
  ) {
    return config;
  }
  const token = useTokenStore.getState().token; // Lấy từ Zustand
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Tự động refresh token nếu gặp lỗi 401
httpRequest.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) {
          useTokenStore.getState().setToken(newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return axios(error.config); // Gửi lại request cũ
        }
      } catch (refreshError) {
        useTokenStore.getState().clearToken();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default httpRequest;
