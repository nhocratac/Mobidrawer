"use client";

import axios, { AxiosError } from "axios";
import env from "./env";
import useTokenStore from "./tokenStore";

// ONE API-client module: every admin API call in this app must go through
// this instance so the Bearer attach + 401 handling apply uniformly. No
// admin endpoint may be called via a second, ad-hoc fetch/axios instance.
const api = axios.create({
  baseURL: env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (config.url?.includes("/auth/login")) {
    return config;
  }
  const token = useTokenStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 handling: terminating shape only — clear the stored token and
// redirect to /login. NO refresh-retry loop is implemented, so there is
// no re-fire path at all; in particular a reload POST
// (/admin/config/reload) is NEVER automatically re-invoked after a 401 —
// it only ever runs from a user click (see ReloadNowButton /
// SaveReloadStatus). This satisfies "at most one attempt, then terminate"
// by never attempting more than the original request.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useTokenStore.getState().clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
