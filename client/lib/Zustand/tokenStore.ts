"use client";

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
        name: "access-token", // Tên key lưu vào localStorage
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          setToken: currentState.setToken,
          clearToken: currentState.clearToken
        }),
      }
    )
  )
);

export default useTokenStore;
