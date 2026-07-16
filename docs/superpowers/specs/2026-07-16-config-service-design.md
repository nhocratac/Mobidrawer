# Config-as-a-Service — Design

Date: 2026-07-16 · Branch: feature/config-service · Status: approved (brainstorming)

## Problem
Backend config today is (1) hardcoded magic strings scattered in services, or (2) static
`application.properties`. Neither is runtime-tunable. A good system lets operators change
business behaviour without redeploy.

## Decomposition (3 sub-projects, sequential — each its own harness sprint)
1. **Config store + typed registry** (this spec, detailed) — DB-backed, type-safe config;
   migrate existing magic strings.
2. **Reload webhook** — refresh in-memory config cache at runtime via an internal HMAC-authed
   endpoint; no restart.
3. **Admin tool** — UI to CRUD config, per-template premium field, dashboard stats, trigger reload.

## Decisions (from brainstorming)
- **Scope of DB config**: business/tunable values only. Secrets (JWT, VNPay, Gemini, mail) stay
  in env — never plaintext in DB.
- **Source of truth**: DB is the sole runtime source for business config (no properties fallback).
  A startup **seeder** guarantees the DB is never empty; boot **fails fast** if DB is unreachable.
- **Consumption**: typed accessor `ConfigService.getInt(ConfigKeys.X)` reading an in-memory cache;
  code never touches raw key strings. Registry declares key + type + default + category + description.
- **Per-entity data is NOT config**: e.g. "template paid/free" is a field on the Template document
  (each template independent), managed via admin Template CRUD in sub-project #3 — not a config key.

---

## Sub-project #1 — Config store + typed registry (DETAILED)

### Components
- **`ConfigKey<T>`** (code registry): declares `key`, `type` (Int/Long/Bool/String/List<String>/Color…),
  `default`, `category`, `description`. All known keys live in a `ConfigKeys` catalog — extending =
  one line + one default.
- **`ConfigItem`** (Mongo collection `app_config`): `{ key, value:String, type, category, description,
  updatedAt, updatedBy }`. Value stored as string, always coerced to the registry type on read.
- **`ConfigService`**: `getInt/getLong/getBool/getString/getList/getEnum(ConfigKey)` → reads
  `ConfigCache`, coerces per registry type. Never hits DB per call.
- **`ConfigCache`**: in-memory `ConcurrentHashMap`, loaded fully at startup. Exposes `refresh()`
  (unused in #1; sub-project #2's webhook calls it).
- **`ConfigSeeder`** (`ApplicationRunner`): for each `ConfigKey`, insert default into DB if absent
  (idempotent). Guarantees "DB sole source" without an empty-DB dead boot.

### Keys migrated in this sprint
| Key | Type | Default | Category | Replaces |
|-----|------|---------|----------|----------|
| `board.free.max_members` | Int | 3 | Limits | BoardServiceImpl:108 |
| `auth.otp.expiry_minutes` | Int | 5 | Timing | AuthServiceImpl:127,179 |
| `payment.pending.expiry_minutes` | Int | 15 | Payment | VNPayServiceImpl:238 (`plusMinutes(2) //For testing` — bug fixed) |
| `cache.default.ttl_ms` | Long | 600000 | Timing | application.properties |
| `comment.subcomment.page_size` | Int | current value | Limits | CommentServiceImpl:38 |

### Data flow (read)
1. Boot → `ConfigSeeder` inserts any missing registry defaults into `app_config` (idempotent).
2. Boot → `ConfigCache` loads all `app_config` into memory.
3. Runtime → service calls `configService.getInt(ConfigKeys.BOARD_FREE_MAX_MEMBERS)` → cache lookup
   → coerce to Integer → return.

### Error handling (fail-fast, explicit)
- DB unreachable at boot → app does **not** start; log states the cause (no silent wrong-value run).
- Registry key missing in DB after seeding → `ConfigMissingException(key)`.
- DB value not coercible to declared type (e.g. `"abc"` for Int) → `ConfigTypeException(key, expectedType)`;
  never swallow and return default.

### Out of scope for #1
Runtime reload webhook (#2); admin UI + dashboard + Template `isPremium` field (#3); secrets (stay env).
Frontend-only values (e.g. the pen-colour palette in `LeftToolBar.jsx`) are NOT migrated here — they
have no backend read-site. They become config once the frontend reads config via an API (a later step).
5 keys migrate in this sprint.

### Verification
- Unit-free repo: gate on `./mvnw compile` + code-level asserts (registry has all migrated keys;
  no remaining hardcoded literals at the migrated call-sites; seeder idempotent).
- Runtime: boot backend on JDK 25, confirm `app_config` collection seeded with the 6 keys; confirm a
  service path (e.g. add 4th member on FREE) reads the DB value.

---

## Sub-project #2 — Reload webhook (SKETCH)
- Internal endpoint `POST /internal/config/reload`, authed by **HMAC** over the request
  (timestamp + body) with a shared **secret key** in env (`CONFIG_RELOAD_SECRET`), replay-protected
  by a timestamp window. On success → `ConfigCache.refresh()` reloads from DB; returns changed-key count.
- Reuses the existing `TraceIdFilter` for correlation; ordered before security so unauthenticated
  calls are rejected with 401 (not 500 — see the error-mapping bug from the API test run).
- No admin UI yet; triggerable by the admin tool (#3) or curl.

## Sub-project #3 — Admin tool (SKETCH)
- Admin-only section in the existing Next.js client (guarded route by `role=ADMIN`).
- Config CRUD grouped by `category`; type-aware editors (number, toggle, color, list); validates value
  against the registry type before save; writes via a backend admin API; then calls the reload webhook.
- Per-template premium field (`Template.isPremium` / `requiredPlan`) editing in Template management.
- Dashboard: config-change audit (updatedBy/updatedAt), plus basic counts (users, boards, active plans).
- Decisions deferred to #3's own brainstorming: dashboard metric set, admin auth hardening, audit depth.

## Cross-cutting
- Backlog bugs from the 2026-07-15 API test run should be folded in where they touch this work:
  the payment `plusMinutes(2)` fix lands in #1; the 500-vs-4xx error-mapping fix should land alongside
  #2's endpoint (401 for bad HMAC). The IDOR on `addCanvasPath` is unrelated — separate sprint.
