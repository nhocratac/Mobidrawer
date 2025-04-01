import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// Định nghĩa kiểu dữ liệu cho user
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// Kiểu dữ liệu của Zustand Store
interface TokenState {
  token: string;
  user: User | null;
  setToken: (newToken: string) => void;
  clearToken: () => void;
}


// 🆕 Store Zustand
const useTokenStore = create<TokenState>()(
  devtools(
    persist(
      (set, get) => ({
        token: "",
        user: null, // 🆕 Thêm user vào store

        // 🆕 Khi setToken -> tự động set user
        setToken: (newToken) => {
          const decoded = decodeToken(newToken);
          set({
            token: newToken,
            user: decoded?.user || null, // Lưu user vào store
          });
        },

        // 🆕 Khi clearToken -> xóa cả user
        clearToken: () => set({ token: "", user: null }),
      }),
      {
        name: "access-token",
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          setToken: currentState.setToken,
          clearToken: currentState.clearToken,
        }),
      }
    )
  )
);

export default useTokenStore;


// 🆕 Hàm kiểm tra token hết hạn
export function isTokenExpired(token: string): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}


export const decodeToken = (token : string) => {
  try {
    const base64Url = token.split('.')[1]; // Lấy payload
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};
