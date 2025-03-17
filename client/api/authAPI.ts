import httpRequest from "@/utils/httpRequest";
import useTokenStore from "@/lib/Zustand/tokenStore"; // Zustand store để quản lý token

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

// ✅ Register
const register = async (data: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}) => {
  try {
    const res = await httpRequest.post<AuthResponse>("/auth/register", data);
    return res.data;
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
};

// ✅ Verify Register
const verifyRegister = async (data: { code: string; email: string }) => {
  try {
    const res = await httpRequest.post<AuthResponse>("/auth/verify-register", data);
    return res.data;
  } catch (error) {
    console.error("Verify register error:", error);
    throw error;
  }
};

// ✅ Login
const login = async (data: { email: string; password: string }) => {
  try {
    const res = await httpRequest.post<AuthResponse>("/auth/login", data, {
      withCredentials: true, // Gửi cookies refreshToken
    });

    if (res.status === 200) {
      const  accessToken  = res.headers["authorization"].split(' ')[1];
      useTokenStore.getState().setToken(accessToken); // Lưu vào Zustand
      return res.data;
    }

    throw new Error(res.statusText);
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// ✅ Refresh Token
 async function refreshAccessToken() {
  try {
    const res = await httpRequest.get("/auth/refresh", {
      withCredentials: true, // Gửi cookie refreshToken
    });

    if (res.status === 200) {
      const newAccessToken = res.headers['authorization'].split(' ')[1]
      useTokenStore.getState().setToken(newAccessToken);
      return newAccessToken;
    }
    throw new Error("Unable to refresh token");
  } catch (error) {
    console.error("Refresh token failed:", error);
    useTokenStore.getState().clearToken();
    window.location.href = "/login";
    return null;
  }
}

export { register, login, verifyRegister ,refreshAccessToken};
