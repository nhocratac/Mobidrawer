# Admin Tool — Requirements Brief

Date: 2026-07-16 · Sub-project #3 of the Config-as-a-Service track
(see `2026-07-16-config-service-design.md`; #1 config store: **built**; #2 reload webhook: **in progress**)

Locked decisions (not re-litigated here): separate Next.js app; new admin REST APIs on the
existing Spring Boot backend; JWT + `role=ADMIN` auth; config writes trigger the #2 HMAC reload
webhook; scope pillars = config CRUD, template premium flag, 4-area dashboard.

---

## 1. Personas & goals

| Persona | Who | Goals |
|---|---|---|
| **Operator (primary)** | Team member with `UserRoles.ADMIN` who tunes runtime behaviour | Change business config (limits, timings, payment durations) without redeploy; verify the change took effect (reload result + audit trail) |
| **Content admin** | Same ADMIN role today (single role system — see Open Q1) | Mark templates premium/free, control which plan unlocks which template |
| **Business stakeholder** | Admin reading, not writing | Glance metrics: user/board growth, revenue from VNPay purchases, plan mix, live activity |
| **Auditor / on-call debugger** | Admin investigating "why did behaviour change at 14:02?" | Trace config changes: which key, old → new value, who, when |

Non-persona: end users never see this app; it lives on a separate origin and is not linked from the client.

---

## 2. Epics → user stories

### Epic A — Admin authentication & shell

**A1.** As an admin, I want to sign in to the admin app with my existing account and be rejected
unless my role is ADMIN, so that only operators reach the tool.
- Given a user with `role=USER` and valid credentials, When they log in to the admin app,
  Then login is refused with an explicit "not an admin" message and no admin JWT/session is stored.
- Given a user with `role=ADMIN`, When they log in, Then they land on the dashboard and every
  subsequent API call carries the JWT.
- Given an expired/absent JWT, When any admin page loads, Then the app redirects to login (no
  partial data flashes).
- Given an ADMIN JWT, When it calls a non-existent-yet-guarded admin route, Then backend returns
  403 for USER tokens and 401 for missing tokens (never 500).

**A2.** As an operator, I want every admin API rejected server-side for non-ADMIN tokens, so that
the UI guard is not the only defense.
- Given a valid USER JWT, When it calls any `/api/v1/admin/**` endpoint, Then 403.
- Given no token, Then 401.
- (Enforced by Spring Security rule, not per-controller checks — see NFR and Gap G6.)

### Epic B — Config management

**B1.** As an operator, I want to see all config keys grouped by category with current value, type,
description, and last change, so that I can find a knob quickly.
- Given the registry has keys in categories Limits/Timing/Payment, When I open Config, Then keys
  are grouped by `category` and each row shows key, current value, type, description,
  `updatedBy`, `updatedAt`.
- Given a key exists in the registry but not in `app_config` (should not happen post-seeder),
  Then the row is flagged as "unseeded" rather than hidden.

**B2.** As an operator, I want a type-aware editor per key that validates against the registry type
before save, so that I cannot store an uncoercible value (which would throw `ConfigTypeException`
at runtime).
- Given an INT key (e.g. `board.free.max_members`), When I type "abc", Then the Save button is
  disabled and an inline type error is shown (client-side).
- Given the same invalid value is forced via API, When PUT is called, Then backend re-validates
  against the registry `ConfigValueType` and returns 400 with the key and expected type — the
  server never persists an uncoercible value.
- Given a LONG key (`cache.default.ttl_ms`), When I enter a value beyond Integer range but within
  Long, Then it is accepted.
- Given a key not in the `ConfigKeys` registry, When PUT is called, Then 404/400 — the API only
  accepts registered keys (no free-form key creation from the UI).

**B3.** As an operator, I want saving a config value to write to Mongo, record who/when, and trigger
the reload webhook, so that the running backend picks up the change without restart.
- Given I change `auth.otp.expiry_minutes` from 5 to 10 and confirm, When save succeeds, Then
  `app_config` holds `value="10"`, `updatedBy=<my email/id>`, `updatedAt=now`, and the tool calls
  `POST /internal/config/reload` (HMAC) and displays the webhook's changed-key count.
- Given the reload webhook fails (non-2xx / timeout), When save has already persisted, Then the UI
  shows "saved but NOT reloaded — backend may serve the old value" with a Retry-reload action
  (save and reload are two visible steps, never silently conflated).
- Given a successful save, Then an audit record exists (see B4 / Gap G1).

**B4.** As an auditor, I want a config audit log with key, old value → new value, updatedBy,
updatedAt, so that I can reconstruct any behaviour change.
- Given `board.free.max_members` was changed 3→5 by admin A then 5→4 by admin B, When I open the
  audit log, Then two entries appear newest-first, each with key, oldValue, newValue, actor,
  timestamp.
- Given >20 entries, Then the log is paginated (see NFR).
- Given a filter by key or by actor, Then only matching entries return.
- **Gap G1:** no audit collection exists. `ConfigItem` stores only the *latest* `updatedBy`/`updatedAt`;
  old→new history is impossible today. The admin config-write endpoint must append to a new
  `config_audit` collection (`{key, oldValue, newValue, updatedBy, updatedAt, traceId}`) in the
  same operation as the update.

**B5.** As an operator, I want a manual "Reload config now" action, so that I can force a cache
refresh independently of a save (e.g. after a direct DB fix).
- Given I click Reload, When the webhook returns 2xx, Then the changed-key count is displayed.
- Given the HMAC secret is misconfigured, Then the tool surfaces the 401 clearly (never retries in a loop).

### Epic C — Template premium management

**C1.** As a content admin, I want to list all templates with title, owner, public flag, preview,
and premium status, so that I can manage the catalog.
- Given templates exist, When I open Templates, Then a paginated list shows id, title,
  `previewImageUrl` thumbnail, owner (resolved to name/email via `UserRepository.getBaseInformation`),
  `isPublic`, premium status, `updateAt`.
- Given the existing public API only returns `isPublic=true` templates
  (`TemplateRepository.findByIsPublicTrue`), Then the admin list endpoint must return ALL
  templates including private ones (new endpoint — Gap G3).

**C2.** As a content admin, I want to set a template's premium requirement (free vs required plan),
so that monetized templates are gated by plan.
- Given a free template, When I set `requiredPlan=PRO` and save, Then the Template document
  persists the new field and the list reflects it immediately.
- Given the `Plans` enum (FREE/PRO/ENTERPRISE), Then the editor offers exactly those values
  (FREE ≡ not premium).
- Given a USER-role token calls the update endpoint, Then 403.
- **Gap G2:** `Template` has NO `isPremium`/`requiredPlan` field today. The build must add the
  field (recommend a single `requiredPlan: Plans`, defaulting to FREE for all existing documents —
  a boolean `isPremium` cannot express PRO vs ENTERPRISE). Server-side enforcement of the gate in
  the user-facing template-apply flow is a separate follow-up (Open Q4) — this tool only edits the field.

### Epic D — Dashboard

**D1 (audit area).** As an auditor, I want the dashboard to show the latest config changes
(key, old→new, updatedBy, updatedAt), so that recent operational changes are visible at a glance.
- Given config changes exist, When the dashboard loads, Then the 10 most recent audit entries
  render with a link to the full audit log (Epic B4). Depends on Gap G1.

**D2 (counts area).** As a stakeholder, I want basic counts — total users, total boards, active
plans — so that I see product scale.
- Given the DB has N users, M boards, K `UserPlans` with `active=true` and `expiresAt > now`,
  When the dashboard loads, Then those three numbers render, each labeled with its as-of time.
- Given Mongo is slow, Then counts load independently (one failing card does not blank the dashboard).
- **Gap G4:** no aggregate/count endpoints exist. New `GET /api/v1/admin/stats/counts` doing
  `count()` on `users`, `boards`, and a filtered count on `user_plans`. Note: `User` has no
  `createdAt`, so "new users this week" is NOT possible without a model change — keep to totals
  (Open Q5).

**D3 (revenue area).** As a stakeholder, I want revenue and plan-mix figures from VNPay purchases,
so that I can track monetization.
- Given completed purchases exist as `UserPlans` documents (`amount`, `plan`, `orderCode`,
  `createdAt`, `expiresAt`, `active`), When I open the revenue view, Then I see: total revenue
  (sum of `amount`), revenue and purchase count grouped by `plan`, and a paginated transaction
  list (orderCode, user, plan, amount, createdAt, active) filterable by date range on `createdAt`.
- Given a plan renewal extends an existing `UserPlans` document (VNPayServiceImpl updates in place
  for same-plan renewal), Then the caveat is documented in the UI: transaction count ≈ purchases,
  not exact (renewals do not create a new document — see Gap G5/Open Q6).
- **Gap G5:** there is no VNPay transaction collection — `UserPlans` is the only durable payment
  record; pending payments live only in Redis (`RedisTemplate<String, PaymentRequest>`) and failed
  payments are not persisted at all. Revenue = aggregation over `user_plans`. If per-transaction
  history (including renewals/failures) is required, a `payment_transactions` collection must be
  added at payment-callback time — PO decision (Open Q6).

**D4 (realtime area).** As an operator, I want to see active boards and online users from Redis
presence, so that I can gauge live load.
- Given Redis holds presence sets `board:{boardId}` of user DTOs (CacheUserInBoardServiceImpl),
  When the realtime card loads, Then it shows: number of boards with a non-empty presence set,
  total distinct online users across sets, and a top-N list of boards by online-user count with
  board name resolved from `boards`.
- Given no active sessions, Then zeros render (not an error).
- The card auto-refreshes on an interval (default 30s, no websocket needed for v1).
- **Gap G6a:** no endpoint exposes this. New `GET /api/v1/admin/stats/realtime` that SCANs
  `board:*` (never `KEYS` in prod) and aggregates. Cap the SCAN + top-N server-side.

---

## 3. Data / API needs per story (grounded)

All new endpoints under `/api/v1/admin/**`, guarded by `hasRole("ADMIN")` at the SecurityConfig
level. Existing building blocks: `ConfigKeys.ALL` (registry), `ConfigItemRepository`,
`ConfigCache.refresh()` (via #2 webhook), `UserRepository`, `BoardRepository`, `UserPlansRepository`,
`TemplateRepository`, `DrawUserDetails` (already emits `ROLE_ADMIN` authority).

| Story | Endpoint (new unless noted) | Fields | Exists? |
|---|---|---|---|
| A1/A2 | `POST /api/v1/auth/login` (existing) + new SecurityConfig rule `/api/v1/admin/** → hasRole("ADMIN")` | JWT; role claim already derivable via `DrawUserDetails` | Login exists; **no admin route rule anywhere** (Gap G6) |
| B1 | `GET /api/v1/admin/config` | Merge of registry (key, type, default, category, description) + `app_config` (value, updatedBy, updatedAt) | **Missing** |
| B2/B3 | `PUT /api/v1/admin/config/{key}` body `{value}` | Validate key ∈ `ConfigKeys.ALL`, coerce per `ConfigValueType`; set `updatedBy` from JWT, `updatedAt=now`; append audit doc; respond with old/new | **Missing**. Note: `ConfigValueType` currently has only INT and LONG — "toggle/color/list editors" from the design sketch have no backend types yet; v1 editors are number-only until the enum grows (Gap G7) |
| B3/B5 | `POST /internal/config/reload` (sub-project #2) called server-to-server or from the tool with HMAC | changed-key count | **In progress (#2)** — Admin Tool must not ship before #2 lands, or must degrade to "saved, reload pending" |
| B4/D1 | `GET /api/v1/admin/config/audit?key=&actor=&page=&size=` | `config_audit`: key, oldValue, newValue, updatedBy, updatedAt, traceId | **Missing — collection does not exist** (Gap G1) |
| C1 | `GET /api/v1/admin/templates?page=&size=` | id, title, description, owner(+resolved name), previewImageUrl, isPublic, requiredPlan, updateAt — must include private templates | **Missing** (public API filters `isPublicTrue`) (Gap G3) |
| C2 | `PATCH /api/v1/admin/templates/{id}/premium` body `{requiredPlan}` | `Template.requiredPlan: Plans` | **Missing — field does not exist on Template** (Gap G2) |
| D2 | `GET /api/v1/admin/stats/counts` | userCount, boardCount, activePlanCount (`active=true && expiresAt>now`) | **Missing** (Gap G4) |
| D3 | `GET /api/v1/admin/stats/revenue?from=&to=` + `GET /api/v1/admin/plans?page=&size=&from=&to=` | Aggregate over `user_plans`: sum(amount), group by `plan`; list: orderCode, userId(+resolved email), plan, amount, createdAt, expiresAt, active | **Missing**; underlying data limited to `UserPlans` (Gap G5) |
| D4 | `GET /api/v1/admin/stats/realtime` | activeBoardCount, onlineUserCount (distinct), topBoards[{boardId, name, count}] via Redis SCAN `board:*` | **Missing** (Gap G6a) |

### Gap register (must-build items outside the Next.js app)
- **G1** `config_audit` collection + write-path in the admin config PUT (no history exists today).
- **G2** `Template.requiredPlan` field (recommend enum over boolean) + migration default FREE.
- **G3** Admin template list endpoint returning private templates (public API can't).
- **G4** Aggregate count endpoint(s); `User.createdAt` absent → no time-series user growth in v1.
- **G5** No payment-transaction collection; revenue derived from `user_plans` only; renewals mutate
  in place, failures unrecorded.
- **G6** No `hasRole("ADMIN")` rule exists in `SecurityConfig` today — the whole `/api/v1/admin/**`
  security rule is new. Also verify the JWT filter populates authorities on every admin request.
- **G6a** Realtime stats endpoint over Redis presence (SCAN-based).
- **G7** `ConfigValueType` supports only INT/LONG — BOOL/STRING/LIST/COLOR editors blocked until the
  enum + `ConfigService` getters grow (out of scope unless PO pulls it in).
- **G8** The #2 reload webhook is a hard dependency for B3/B5; HMAC secret (`CONFIG_RELOAD_SECRET`)
  must be available to whichever side calls it (recommend: backend admin API calls reload
  internally after a successful config write, so the HMAC secret never reaches the Next.js app —
  see NFR).

---

## 4. Non-functional requirements

**Admin auth hardening**
- Server-side `hasRole("ADMIN")` on `/api/v1/admin/**` in `SecurityConfig` (one rule, not
  per-controller annotations only); UI route guards are convenience, not security.
- Admin app on a separate origin → its origin must be added to backend CORS allowlist explicitly
  (no wildcard).
- Recommend short-lived JWT for admin sessions and re-auth on sensitive writes deferred (Open Q2).
- 401 vs 403 mapping must be correct (the 2026-07-15 test run found 500-vs-4xx mapping bugs; do
  not reintroduce them on the new endpoints).

**Secrets — never exposed**
- Locked by design: secrets (JWT signing key, VNPay creds, Gemini, mail) are env-only and are NOT
  config keys. The admin API must serve only registry-backed keys, so secrets structurally cannot
  appear. Acceptance: no admin response body ever contains a value for a non-registry key.
- The HMAC `CONFIG_RELOAD_SECRET` stays server-side (backend triggers reload after write; the
  browser never computes HMAC).
- User `password` hash must never appear in any admin response (User model carries it — DTOs are
  mandatory on every endpoint that resolves users).

**Audit trail depth**
- Every config write produces exactly one immutable `config_audit` document (no updates/deletes via
  API). Include `traceId` (TraceIdFilter exists) for log correlation. Retention: keep forever for
  v1 (volume is tiny — 5 keys).
- Template premium changes should also be audited (same collection with an `entityType`
  discriminator, or a parallel one) — PO to confirm (Open Q3).

**Pagination & load**
- All list endpoints (audit, templates, plan transactions) paginated server-side, default size 20,
  max 100; Spring `Pageable` pattern already used by `TemplateRepository`.
- Dashboard aggregates are single-document responses; realtime endpoint uses Redis SCAN with a
  count bound and caps top-N at 10; acceptable staleness 30s (client polling).

**Reliability/UX**
- Save-then-reload is two observable steps; a failed reload never masks a successful save.
- Dashboard cards fail independently.
- All admin responses carry no-cache headers.

---

## 5. Open questions / assumptions for the PO

1. **Single ADMIN role**: `UserRoles` is only USER/ADMIN. Is one admin level acceptable for v1
   (config-writer = template-editor = dashboard-viewer), or do we need finer roles (would require
   a model change)? **Assumption: single ADMIN is fine for v1.**
2. **Admin session policy**: reuse the standard JWT lifetime, or issue shorter-lived tokens /
   require re-login for the admin app? **Assumption: reuse existing JWT for v1.**
3. **Audit scope**: config-only, or also template premium changes (and future admin writes)?
   **Assumption: config + template premium, one collection with `entityType`.**
4. **Premium enforcement**: this tool only *sets* `requiredPlan`; where/when does the user-facing
   backend enforce it (template apply/clone path)? Separate sprint? **Assumption: separate sprint;
   flag in UI that the field is not yet enforced if enforcement hasn't shipped.**
5. **Growth metrics**: totals only in v1 (no `User.createdAt` exists). Is adding `createdAt` to
   User (backfill = null/unknown) in scope now or later?
6. **Payment history fidelity**: is `user_plans`-derived revenue (no failed txns, renewals mutate
   in place) sufficient, or do we add a `payment_transactions` collection written at VNPay
   callback? The latter changes the payment flow and needs its own testing.
7. **Config types roadmap**: do we need BOOL/STRING/LIST/COLOR keys soon (G7)? If yes, extending
   `ConfigValueType` + `ConfigService` should be scheduled before or with this sprint so the
   type-aware editor framework isn't built number-only twice.
8. **Deploy target**: where does the admin Next.js app deploy (Vercel like the client? internal
   only / IP-restricted?) — affects CORS and exposure surface.
