"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface TokenState {
  token: string;
  setToken: (newToken: string) => void;
  clearToken: () => void;
  getUserByToken: () => User;
}

const useTokenStore = create<TokenState>()(
  devtools(
    persist(
      (set, get) => ({
        token: "",
        setToken: (newToken) => set({ token: newToken }),
        clearToken: () => set({ token: "" }),
        getUserByToken: () =>
          JSON.parse(
            Buffer.from(get().token.split(".")[1], "base64").toString()
          ).user,
      }),
      {
        name: "access-token", // Tên key lưu vào localStorage
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
