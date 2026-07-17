"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DecodedTokenPayload } from "./types";

// base64url decode of the JWT payload — precedent client/lib/Zustand/tokenStore.ts.
export function decodeToken(token: string): DecodedTokenPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window !== "undefined"
        ? window.atob(base64)
        : Buffer.from(base64, "base64").toString("binary");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 < Date.now();
}

export function getRole(token: string | null | undefined): string | null {
  if (!token) return null;
  const payload = decodeToken(token);
  return payload?.user?.role ?? null;
}

interface TokenState {
  token: string;
  setToken: (newToken: string) => void;
  clearToken: () => void;
}

const useTokenStore = create<TokenState>()(
  persist(
    (set) => ({
      token: "",
      setToken: (newToken: string) => set({ token: newToken }),
      clearToken: () => set({ token: "" }),
    }),
    {
      name: "admin-access-token",
    }
  )
);

export default useTokenStore;
