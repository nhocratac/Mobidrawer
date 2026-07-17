// DTO mirrors of the merged backend admin API (AdminConfigController +
// domain/dto/*). Kept in exact field-for-field sync with the Java shapes
// read at baseline 7bb26c6 — do not add/remove fields speculatively.

// ConfigValueType currently only has INT and LONG registered server-side;
// the union stays open (string) so an unrecognized future type falls into
// the editor's default branch instead of a TS narrowing error.
export type ConfigValueType = "INT" | "LONG" | string;

// AdminConfigEntryDto — GET /admin/config row (8 fields).
export interface AdminConfigEntry {
  key: string;
  category: string;
  type: ConfigValueType;
  description: string;
  value: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  seeded: boolean;
}

// ReloadResultDto — shared by the PUT write path and the manual reload
// proxy. status is never absent/implicit: "OK" or "FAILED".
export interface ReloadResult {
  status: "OK" | "FAILED";
  changedKeys: number | null;
  error: string | null;
}

// AdminConfigWriteResponseDto — PUT /admin/config/{key} response.
// CRITICAL: this is returned with HTTP 200 even when reload.status is
// FAILED — callers must branch on reload.status, never on HTTP status.
export interface AdminConfigWriteResponse {
  key: string;
  oldValue: string | null;
  newValue: string;
  updatedBy: string;
  updatedAt: string;
  reload: ReloadResult;
}

// ConfigAuditEntryDto — one row of GET /admin/config/audit (7 fields).
export interface ConfigAuditEntry {
  entityType: string;
  key: string;
  oldValue: string | null;
  newValue: string | null;
  updatedBy: string;
  updatedAt: string;
  traceId: string;
}

// Spring Data Page<T> JSON shape for the audit endpoint. The UI trusts the
// server's ordering/clamping and never re-sorts or re-slices this.
export interface AuditPage {
  content: ConfigAuditEntry[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface DecodedTokenPayload {
  user?: {
    role?: string;
    email?: string;
    [key: string]: unknown;
  };
  exp?: number;
  [key: string]: unknown;
}
