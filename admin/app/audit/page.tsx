"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import api from "@/lib/api";
import type { AuditPage as AuditPageData } from "@/lib/types";

const PAGE_SIZE = 20;

// Data fetching lives inside this child of AuthGuard (mounts only after the
// guard passes). key/actor/page/size are sent as query params straight
// through to GET /admin/config/audit — no client-side re-sort, no bulk
// fetch + in-memory pagination.
function AuditPageContent() {
  const [key, setKey] = useState("");
  const [actor, setActor] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AuditPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params: Record<string, string | number> = { page, size: PAGE_SIZE };
    if (key.trim()) params.key = key.trim();
    if (actor.trim()) params.actor = actor.trim();

    api
      .get<AuditPageData>("/admin/config/audit", { params })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load audit log");
      });

    return () => {
      cancelled = true;
    };
  }, [key, actor, page]);

  function handleKeyChange(value: string) {
    setKey(value);
    setPage(0); // filter change resets to page 0
  }

  function handleActorChange(value: string) {
    setActor(value);
    setPage(0); // filter change resets to page 0
  }

  return (
    <main className="audit-page">
      <h1>Config audit log</h1>
      <div className="audit-page__filters">
        <label htmlFor="audit-key">Key</label>
        <input
          id="audit-key"
          value={key}
          onChange={(e) => handleKeyChange(e.target.value)}
        />
        <label htmlFor="audit-actor">Actor</label>
        <input
          id="audit-actor"
          value={actor}
          onChange={(e) => handleActorChange(e.target.value)}
        />
      </div>

      {error && <p className="audit-page__error">{error}</p>}
      {!data && !error && <p>Loading…</p>}

      {data && (
        <>
          <table>
            <thead>
              <tr>
                <th>Entity type</th>
                <th>Key</th>
                <th>Old value</th>
                <th>New value</th>
                <th>Updated by</th>
                <th>Updated at</th>
                <th>Trace ID</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((row, i) => (
                <tr key={`${row.key}-${row.updatedAt}-${i}`}>
                  <td>{row.entityType}</td>
                  <td>{row.key}</td>
                  <td>{row.oldValue === null ? <em>(none)</em> : row.oldValue}</td>
                  <td>{row.newValue === null ? <em>(none)</em> : row.newValue}</td>
                  <td>{row.updatedBy}</td>
                  <td>{row.updatedAt}</td>
                  <td>{row.traceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="audit-page__pagination">
            <button
              disabled={data.number <= 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              {" "}
              Page {data.number + 1} of {Math.max(data.totalPages, 1)} (
              {data.totalElements} total){" "}
            </span>
            <button
              disabled={data.number + 1 >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default function AuditPage() {
  return (
    <AuthGuard>
      <AuditPageContent />
    </AuthGuard>
  );
}
