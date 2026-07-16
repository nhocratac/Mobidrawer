# Admin Tool — Product Roadmap & Sprint Plan

Date: 2026-07-16 · PO plan for sub-project #3 (see `2026-07-16-admin-tool-requirements.md`,
`2026-07-16-config-service-design.md`). #1 config store: built. #2 reload webhook: in progress.

Locked (not re-opened): separate Next.js admin app; `/api/v1/admin/**` behind JWT + `role=ADMIN`;
config writes trigger the #2 reload webhook **backend-side** (`CONFIG_RELOAD_SECRET` never in the
browser); the tool ultimately covers all 4 dashboard areas.

---

## 1. MVP definition

**MVP = an ADMIN can log in, change a config key, see the backend pick it up, and prove who
changed what.** That is the entire reason this track exists (design doc: "change business
behaviour without redeploy"). Everything else is read-only reporting or a field-edit whose
downstream enforcement doesn't exist yet.

**IN (MVP / Phase 1):**
- A1, A2 — admin login + server-side `hasRole("ADMIN")` rule (G6). Non-negotiable foundation.
- B1 — config list grouped by category (registry + `app_config` merge).
- B2, B3 — type-validated write, backend-side reload trigger, save/reload as two visible steps.
- B4 — `config_audit` collection + audit log (G1). In MVP because "verify the change took effect
  + who/when" is half the operator's stated goal; retrofitting audit later loses history forever.
- B5 — manual reload. ~Free once the backend reload path exists; it's the recovery action for
  the "saved but NOT reloaded" failure mode, so it ships with B3.

**DEFERRED:**
- D1–D4 (dashboard) → Phase 2. Read-only; zero operator capability lost by waiting.
- C1, C2 (template premium) → Phase 3. Setting `requiredPlan` delivers **no user-visible value**
  until the user-facing enforcement ships (explicitly a separate follow-up, Q4). Lowest urgency.
- G7 config-type expansion, `User.createdAt`, `payment_transactions`, finer roles → backlog
  (see Decisions log).

YAGNI enforced: v1 config editors are **number-only** (INT/LONG — the only types the backend
has). No websockets (30s polling). No time-series charts (no `createdAt`). Single ADMIN role.

---

## 2. Phased roadmap

| Phase | Increment | Releasable outcome |
|---|---|---|
| **1 — MVP** | Admin auth + config management + audit | Operators tune runtime config without redeploy, with full audit trail and reload verification |
| **2 — Dashboard** | Stats APIs + 4-area dashboard (audit, counts, revenue, realtime) | Stakeholders self-serve metrics; on-call sees live load |
| **3 — Template premium** | `requiredPlan` field + template management UI | Content admins pre-stage the premium catalog ahead of enforcement |
| Backlog | Premium enforcement in user flow; `payment_transactions`; `User.createdAt`; G7 types; RBAC | Scheduled separately, each its own contract |

Each phase is a coherent release; Phase 1 alone justifies the tool's existence.

---

## 3. Sprint decomposition (harness workflow)

Each sprint = one frozen contract, backend **or** frontend, statically verifiable, ~4–15 files.
Ordered; dependencies explicit. Sprint 4 may run in parallel with Sprint 3 (both depend only on
Sprints 1–2).

### Sprint 1 — BACKEND: Admin security foundation + config read API
- **Intent:** One `SecurityConfig` rule `/api/v1/admin/** → hasRole("ADMIN")` (G6), admin-origin
  CORS allowlist entry (explicit, no wildcard), correct 401/403 mapping (no 500s — regression
  from the 2026-07-15 test run), `GET /api/v1/admin/config` merging `ConfigKeys.ALL` registry
  with `app_config` (value, updatedBy, updatedAt; "unseeded" flag for registry-only keys).
- **Delivers:** A2, B1 (API), gaps G6.
- **Depends on:** #1 config store (done). **No** dependency on #2.
- **Size:** ~5–8 files (SecurityConfig, CORS config, controller, service, DTOs) · ~8–10 ACs
  (401/403 matrix, merge correctness, no secrets/non-registry keys in any response body).

### Sprint 2 — BACKEND: Config write + audit + reload trigger
- **Intent:** `PUT /api/v1/admin/config/{key}` — key must ∈ registry (else 400/404), value
  re-validated against `ConfigValueType` (else 400 with key + expected type), sets
  `updatedBy` from JWT / `updatedAt=now`, appends one immutable `config_audit` doc
  `{entityType:"CONFIG", key, oldValue, newValue, updatedBy, updatedAt, traceId}` (G1), then
  calls `POST /internal/config/reload` **server-to-server with HMAC** (G8) and returns
  save-result + reload-result (changed-key count or failure) as distinct fields.
  Plus `POST /api/v1/admin/config/reload` (manual proxy, B5) and
  `GET /api/v1/admin/config/audit?key=&actor=&page=&size=` (paginated, default 20 / max 100).
- **Delivers:** B2 (server), B3, B4 (API), B5 (API); gaps G1, G8.
- **Depends on:** Sprint 1; **#2 reload webhook merged** (hard gate — if #2 slips, contract
  degrades to persist + audit + response flag `reloadStatus: "PENDING"`, reload call added in a
  follow-up mini-sprint).
- **Size:** ~6–10 files · ~10–12 ACs (validation matrix, audit immutability, reload-failure
  never masks save, HMAC secret never in any response).

### Sprint 3 — FRONTEND: Admin app shell + config management UI  *(MVP complete)*
- **Intent:** New Next.js admin app: login against existing `POST /api/v1/auth/login`, refuse
  non-ADMIN with explicit message and no stored session, route guard redirecting expired/absent
  JWT (no partial-data flash), no-cache handling. Config page: keys grouped by category,
  type-aware numeric editor (client-side INT/LONG validation, Save disabled on invalid),
  save→reload shown as two steps with "saved but NOT reloaded" + Retry-reload on webhook
  failure, manual "Reload config now" button (surfaces 401 clearly, never auto-retries in a
  loop), paginated audit log with key/actor filters.
- **Delivers:** A1, B1–B5 (UI).
- **Depends on:** Sprints 1–2.
- **Size:** ~10–15 files (app scaffold, auth lib, guard, 2 pages, editor + audit components,
  API client) · ~12–15 ACs.

### Sprint 4 — BACKEND: Admin stats APIs
- **Intent:** `GET /api/v1/admin/stats/counts` (user/board counts + `active=true && expiresAt>now`
  plan count, per-value as-of timestamps — G4); `GET /api/v1/admin/stats/revenue?from=&to=` +
  `GET /api/v1/admin/plans?...` (aggregate over `user_plans`: sum(amount), group by plan;
  paginated transaction list with user resolved via DTO — **never** the password hash — G5
  caveat documented in response metadata); `GET /api/v1/admin/stats/realtime` (Redis **SCAN**
  `board:*` with count bound, distinct online users, top-10 boards with names resolved — G6a).
- **Delivers:** D2, D3, D4 (APIs); gaps G4, G5 (as-is aggregation), G6a.
- **Depends on:** Sprint 1 only (can run parallel to Sprint 3).
- **Size:** ~6–9 files · ~9–11 ACs.

### Sprint 5 — FRONTEND: Dashboard (4 areas)
- **Intent:** Dashboard page with 4 independently-loading/failing cards: recent audit (10
  latest, links to full log — reuses Sprint 2 API), counts, revenue + plan mix with drill-in
  transaction list filterable by date range (renewal caveat shown in UI), realtime card with
  30s polling and graceful zeros.
- **Delivers:** D1, D2, D3, D4 (UI).
- **Depends on:** Sprints 3, 4 (and 2 for the audit feed).
- **Size:** ~8–12 files · ~10–12 ACs.

### Sprint 6 — BACKEND: Template premium field + admin template APIs
- **Intent:** Add `Template.requiredPlan: Plans` defaulting FREE for all existing docs (enum,
  not boolean — G2); `GET /api/v1/admin/templates?page=&size=` returning **all** templates
  including private, owner resolved via `getBaseInformation` DTO (G3);
  `PATCH /api/v1/admin/templates/{id}/premium` `{requiredPlan}` validated against `Plans`,
  writing an audit doc with `entityType:"TEMPLATE"` (Decision Q3).
- **Delivers:** C1, C2 (APIs); gaps G2, G3.
- **Depends on:** Sprints 1, 2 (audit collection).
- **Size:** ~5–8 files · ~8–10 ACs.

### Sprint 7 — FRONTEND: Template management UI
- **Intent:** Templates page: paginated list (thumbnail, title, owner, isPublic, requiredPlan,
  updateAt), plan editor offering exactly FREE/PRO/ENTERPRISE, immediate list refresh on save,
  persistent banner: "premium gating not yet enforced in the user app" until the enforcement
  sprint ships.
- **Delivers:** C1, C2 (UI).
- **Depends on:** Sprints 3, 6.
- **Size:** ~5–8 files · ~7–9 ACs.

**Total: 7 sprints (4 backend, 3 frontend), 3 releases.** Sprint 1 is unblocked today.

---

## 4. Decisions log (BA's 8 open questions)

| # | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | Single ADMIN role? | **Yes for v1.** | One team, four hats on the same people today; RBAC is a model change with zero current demand — add when a second role actually exists. |
| Q2 | Admin session policy | **Reuse existing JWT lifetime.** | Internal tool, separate origin, server-side role gate; shorter-lived tokens are a hardening backlog item, not an MVP blocker, and fully reversible later. |
| Q3 | Audit scope | **One `config_audit` collection with `entityType` discriminator (CONFIG / TEMPLATE); template premium writes audited from day one (Sprint 6).** | One collection, one query path, one dashboard feed; the discriminator costs one field now vs a migration later. |
| Q4 | Premium enforcement location | **Separate backlog sprint (user-facing template-apply path), not in this roadmap; UI shows a "not yet enforced" banner until it ships.** | Enforcement touches user-facing flows and needs its own contract + tests; conflating it would break the one-contract-per-sprint rule. |
| Q5 | `User.createdAt` / growth metrics | **Defer. Totals only in v1.** | Backfill would be null anyway, so "growth this week" starts empty regardless of when we add it; add `createdAt` in the backlog with no admin-tool coupling. |
| Q7 | Config types (G7) | **Defer BOOL/STRING/LIST/COLOR. Ship number-only, but Sprint 3's editor must be a type-dispatch component (switch on registry type) so new types are additive, not a rewrite.** | All 5 live keys are INT/LONG; building editors for types the backend can't serve is speculative. The dispatch structure removes the "built number-only twice" risk the BA flagged. |
| Q6, Q8 | → | **Escalated below** (product default stated for each). | |

### ESCALATE TO HUMAN

1. **Q6 — `payment_transactions` collection (payment history fidelity).** Irreversible data
   decision: every day without it, renewal/failure history is lost forever and can never be
   backfilled; it also modifies the live VNPay callback path (real money, needs its own
   testing). **Default if no answer:** ship Phase 2 revenue from `user_plans` with the caveat
   documented in the UI (as planned); decide the collection separately. The roadmap does not
   block on this.
2. **Q8 — Admin app deploy target** (Vercel like the client vs internal/IP-restricted).
   Exposure-surface and infra-cost call that only the human can make; it determines the exact
   CORS origin in Sprint 1 and whether extra network controls are needed. **Default if no
   answer:** Vercel with the exact origin allowlisted and no public linking — Sprint 1 takes
   the origin as a config/env value so the decision doesn't block build start.

---

## 5. Risks & cut lines

**Risks**
- **#2 reload webhook slips** → Sprint 2's degrade path applies (persist + audit +
  `reloadStatus: PENDING`); Sprint 3 UI already renders save/reload as separate steps, so no
  frontend rework. Do **not** ship Phase 1 to operators as "done" until reload works —
  "saved but not live" silently is the one failure mode the design forbids.
- **Q8 unanswered at Sprint 1 start** → mitigated: origin is an env value; only deploy waits.
- **Revenue numbers challenged by stakeholders** (renewal mutation caveat, G5) → caveat is in
  the UI and API metadata; escalation #1 is the fix if fidelity matters.
- **Redis SCAN cost on realtime card** → bounded SCAN + server-side top-10 cap + 30s polling
  are contract ACs in Sprint 4, not implementation suggestions.

**Cut lines (drop in this order if time-constrained)**
1. **Phase 3 entirely** (Sprints 6–7) — premium field is inert until enforcement ships anyway.
2. **D4 realtime card** (halve Sprint 4, trim Sprint 5) — nice-to-have live gauge.
3. **D3 transaction drill-in list** — keep the aggregate revenue numbers, cut the paginated list.
4. **Never cut:** A1/A2, B3's two-step save/reload UX, B4 audit, the no-secrets NFR. These are
   the product.

**First action for the orchestrator:** `/harness-new-sprint` for **Sprint 1 — Admin security
foundation + config read API** (backend). It has zero unmet dependencies.
