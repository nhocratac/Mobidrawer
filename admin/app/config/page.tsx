"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import ConfigEditor from "@/components/ConfigEditor";
import ReloadNowButton from "@/components/ReloadNowButton";
import api from "@/lib/api";
import type { AdminConfigEntry } from "@/lib/types";

// Data fetching lives inside this child of AuthGuard, so it only mounts
// (and only then fires its effect) once the guard has confirmed an
// unexpired token — never in parallel with the guard's decision.
function ConfigPageContent() {
  const [entries, setEntries] = useState<AdminConfigEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AdminConfigEntry[]>("/admin/config")
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Failed to load config");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="config-page__error">{error}</p>;
  if (!entries) return <p>Loading configuration…</p>;

  // Grouping is computed from whatever category values arrive — no
  // hardcoded category list.
  const grouped = entries.reduce<Record<string, AdminConfigEntry[]>>(
    (acc, entry) => {
      (acc[entry.category] ||= []).push(entry);
      return acc;
    },
    {}
  );

  return (
    <main className="config-page">
      <h1>Configuration</h1>
      <ReloadNowButton />
      {Object.entries(grouped).map(([category, rows]) => (
        <section key={category} className="config-page__category">
          <h2>{category}</h2>
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Type</th>
                <th>Description</th>
                <th>Updated by</th>
                <th>Updated at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.key}>
                  <td>
                    {entry.key}
                    {/* seeded=false rows are flagged, not hidden */}
                    {!entry.seeded && (
                      <span className="config-page__unseeded"> (unseeded)</span>
                    )}
                  </td>
                  <td>
                    <ConfigEditor entry={entry} />
                  </td>
                  <td>{entry.type}</td>
                  <td>{entry.description}</td>
                  <td>{entry.updatedBy ?? "—"}</td>
                  <td>{entry.updatedAt ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </main>
  );
}

export default function ConfigPage() {
  return (
    <AuthGuard>
      <ConfigPageContent />
    </AuthGuard>
  );
}
