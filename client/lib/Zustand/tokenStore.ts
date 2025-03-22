import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TokenState {
  token: string;
  setToken: (newToken: string) => void;
  clearToken: () => void;
}

const useTokenStore = create<TokenState>()(
  devtools(
    persist(
      (set) => ({
        token: "",
        setToken: (newToken) => set({ token: newToken }),
        clearToken: () => set({ token: "" }),
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

export default useTokenStore;
