"use client";

import { useState } from "react";
import api from "@/lib/api";
import type { ReloadResult } from "@/lib/types";

// Manual reload (B5): calls POST /admin/config/reload exactly once per
// click (click-handler-only, no effect/interval/subscription) and surfaces
// status/changedKeys/error — an upstream 401 embedded in the error text is
// shown to the operator verbatim. Never auto-retries.
export default function ReloadNowButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ReloadResult>("/admin/config/reload");
      setResult(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError("Unauthorized (401) while reloading — your session may have expired.");
      } else {
        setError(err?.message || "Reload request failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reload-now">
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Reloading…" : "Reload config now"}
      </button>
      {result?.status === "OK" && (
        <p className="reload-now__ok">
          Reloaded — {result.changedKeys ?? 0} key(s) changed.
        </p>
      )}
      {result?.status === "FAILED" && (
        <p className="reload-now__failed">Reload failed: {result.error}</p>
      )}
      {error && <p className="reload-now__error">{error}</p>}
    </div>
  );
}
