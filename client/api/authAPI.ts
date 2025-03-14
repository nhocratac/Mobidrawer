
import httpRequest from "@/utils/httpRequest";
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

const register = async (data: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}) => {
  try {
    const res = await httpRequest.post("/auth/register", data);
    if (res.status === 200) {
      return res.json();
    }
    throw new Error(res.statusText);
  } catch (error) {
    throw error;
  }
};

const verifyRegister = async (data: { code: string; email: string }) => {
  try {
    const res = await httpRequest.post("/auth/verify-register", data);
    if (res.status === 200) {
      return res.json();
    }
    throw new Error(res.statusText);
  } catch (error) {
    throw error;
  }
};

const login = async (data: { email: string; password: string })  => {
  try {
    const res = await httpRequest.post("/auth/login", data, {
      credentials : 'include'
    });
    console.log(res);
    if (res.status === 200) {
      return res;
    }
    throw new Error(res.statusText);
  } catch (error) {
    throw error;
  }
};

export async function refreshAccessToken() {
  try {
    const res = await fetch("https://backend.example.com/api/v1/auth/refresh", {
      method: "GET",
      credentials: "include", // Để gửi cookie refreshToken
    });

    if (!res.ok) {
      throw new Error("Unable to refresh token");
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken); // Lưu token mới vào localStorage

    return data.accessToken;
  } catch (error) {
    console.error("Refresh token failed:", error);
    localStorage.removeItem("accessToken");
    window.location.href = "/login"; // Chuyển hướng đến trang đăng nhập
    return null;
  }
}

export { register, login, verifyRegister };
