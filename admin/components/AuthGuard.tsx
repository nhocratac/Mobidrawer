"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useTokenStore, { isTokenExpired } from "@/lib/tokenStore";

type GuardState = "checking" | "authenticated" | "unauthenticated";

// Route guard (A1): renders NO protected children until the stored token is
// verified present and unexpired. Absent/expired -> redirect to /login with
// only a placeholder painted (children never mount on that path, so a
// page's data-fetch effect — which lives inside the child component — is
// gated on this guard's success, not merely co-located with it).
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>("checking");
  const router = useRouter();

  useEffect(() => {
    function evaluate() {
      const token = useTokenStore.getState().token;
      if (!token || isTokenExpired(token)) {
        setState("unauthenticated");
        router.replace("/login");
        return;
      }
      setState("authenticated");
    }

    if (useTokenStore.persist.hasHydrated()) {
      evaluate();
      return;
    }
    const unsubscribe = useTokenStore.persist.onFinishHydration(evaluate);
    return unsubscribe;
  }, [router]);

  if (state !== "authenticated") {
    return <div className="auth-guard-placeholder">Checking session…</div>;
  }

  return <>{children}</>;
}
