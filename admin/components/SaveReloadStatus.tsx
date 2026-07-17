"use client";

import { useState } from "react";
import api from "@/lib/api";
import type { AdminConfigWriteResponse, ReloadResult } from "@/lib/types";

interface Props {
  response: AdminConfigWriteResponse;
  onRetried: (updated: AdminConfigWriteResponse) => void;
}

// Two-step save/reload UX (B3): the PUT response is HTTP 200 even when the
// reload sub-step FAILED — this component branches on response.reload.status
// (never on HTTP status, which cannot distinguish the two cases) and renders
// two genuinely different states. Retry-reload calls the reload endpoint
// exactly once per click — it is wired to this button's onClick only, never
// to an effect/interval, so it can never auto-re-fire.
export default function SaveReloadStatus({ response, onRetried }: Props) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRetryClick() {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await api.post<ReloadResult>("/admin/config/reload");
      onRetried({ ...response, reload: res.data });
    } catch (err: any) {
      setRetryError(err?.message || "Retry reload failed");
    } finally {
      setRetrying(false);
    }
  }

  if (response.reload.status === "OK") {
    return (
      <p className="save-reload-status save-reload-status--ok">
        Saved and reloaded ({response.reload.changedKeys ?? 0} key(s) changed).
      </p>
    );
  }

  return (
    <div className="save-reload-status save-reload-status--failed">
      <p>
        Saved but NOT reloaded — the backend may still serve the old value.
        Reload error: {response.reload.error ?? "unknown error"}
      </p>
      <button onClick={handleRetryClick} disabled={retrying}>
        {retrying ? "Retrying…" : "Retry reload"}
      </button>
      {retryError && <p className="save-reload-status__error">{retryError}</p>}
    </div>
  );
}
