"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useTokenStore, { isTokenExpired } from "@/lib/tokenStore";

// Root landing (A1): no protected data lives here — it only decides where
// to send the operator based on the stored token, then redirects. Painted
// content is a placeholder only; nothing protected renders on this route.
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    function decide() {
      const token = useTokenStore.getState().token;
      if (token && !isTokenExpired(token)) {
        router.replace("/config");
      } else {
        router.replace("/login");
      }
    }

    if (useTokenStore.persist.hasHydrated()) {
      decide();
      return;
    }
    const unsubscribe = useTokenStore.persist.onFinishHydration(decide);
    return unsubscribe;
  }, [router]);

  return <div className="auth-guard-placeholder">Loading…</div>;
}
