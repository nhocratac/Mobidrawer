"use client";

import { useState } from "react";
import api from "@/lib/api";
import type { AdminConfigEntry, AdminConfigWriteResponse } from "@/lib/types";
import SaveReloadStatus from "./SaveReloadStatus";

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;
const LONG_MIN = BigInt("-9223372036854775808");
const LONG_MAX = BigInt("9223372036854775807");

// Type-DISPATCH validator (Q7): INT/LONG get dedicated branches, anything
// else falls to a default (the caller treats non-INT/LONG as read-only).
// LONG uses BigInt so beyond-2^53 values (e.g. cache.default.ttl_ms) are
// compared exactly instead of losing precision through Number().
function validate(type: string, raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "Value is required";
  if (!/^-?\d+$/.test(trimmed)) return "Must be a whole number";

  switch (type) {
    case "INT": {
      const n = Number(trimmed);
      if (n < INT_MIN || n > INT_MAX) {
        return `Must be between ${INT_MIN} and ${INT_MAX}`;
      }
      return null;
    }
    case "LONG": {
      let big: bigint;
      try {
        big = BigInt(trimmed);
      } catch {
        return "Must be a whole number";
      }
      if (big < LONG_MIN || big > LONG_MAX) {
        return "Out of Long range";
      }
      return null;
    }
    default:
      return null;
  }
}

export default function ConfigEditor({ entry }: { entry: AdminConfigEntry }) {
  const isEditable = entry.type === "INT" || entry.type === "LONG";
  const [draft, setDraft] = useState(entry.value ?? "");
  const [error, setError] = useState<string | null>(() =>
    isEditable ? validate(entry.type, entry.value ?? "") : null
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminConfigWriteResponse | null>(null);

  function handleChange(value: string) {
    setDraft(value);
    setError(isEditable ? validate(entry.type, value) : null);
    setResult(null);
  }

  // Save is disabled from the SAME `error` state the validator writes —
  // never a separate/dead flag.
  const disabled = !isEditable || saving || Boolean(error);

  async function handleSave() {
    if (disabled) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.put<AdminConfigWriteResponse>(
        `/admin/config/${entry.key}`,
        { value: draft.trim() }
      );
      setResult(res.data);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!isEditable) {
    return (
      <div className="config-editor config-editor--readonly">
        <span>{entry.value ?? "(unset)"}</span>
        <span className="config-editor__note">
          Unsupported type &quot;{entry.type}&quot; — read only
        </span>
      </div>
    );
  }

  return (
    <div className="config-editor">
      <input
        type="text"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        aria-invalid={Boolean(error)}
      />
      <button onClick={handleSave} disabled={disabled}>
        {saving ? "Saving…" : "Save"}
      </button>
      {error && <p className="config-editor__error">{error}</p>}
      {saveError && <p className="config-editor__error">{saveError}</p>}
      {result && <SaveReloadStatus response={result} onRetried={setResult} />}
    </div>
  );
}
