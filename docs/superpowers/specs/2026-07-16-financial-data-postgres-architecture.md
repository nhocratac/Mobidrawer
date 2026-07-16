# Financial Data on PostgreSQL — Architecture Decision & Design

Date: 2026-07-16 · Author: Solution Architect · Status: **PROPOSED** (product decision to use
Postgres for financial data is locked by the human PO; the design below is for review)

Companion docs: `2026-07-16-admin-tool-requirements.md` (Gap G5, story D3),
`2026-07-16-admin-tool-roadmap.md` (Sprint 4 revenue APIs, backlog item `payment_transactions`).

---

## 0. Grounding — what exists today (verified in code)

- **Persistence:** Spring Data MongoDB only (`spring-boot-starter-data-mongodb` in
  `IE213Backend/pom.xml`). There is **no** SQL datasource, no JPA, no migration tooling.
  Spring Boot 3.4.13, Java 25. Redis for cache/presence/pending payments.
- **Payment flow** (`service/impl/VNPayServiceImpl.java`, `controller/PaymentController.java`):
  1. `POST /api/v1/payments/create-payment-url` — generates `vnp_TxnRef` via
     `vnPayUtil.getRandomNumber(8)` (random 8 digits, **not** guaranteed unique), stores a
     `PaymentRequest` (userId, plan, amount, orderCode, createdAt) in **Redis with a 15-minute
     TTL**, returns the VNPay redirect URL.
  2. `GET /api/v1/payments/valid-payment` — return-URL validation: re-reads the Redis entry,
     verifies `vnp_SecureHash`, and on `vnp_ResponseCode == "00"` runs `processPayment(...)`.
     There is **no server-to-server IPN endpoint** — the browser return is the only callback.
  3. `processPayment` deactivates the previous `UserPlans` doc (extending expiry if still
     active) and inserts a new `user_plans` document, updates `User.plan`/`userPlansId`,
     deletes the Redis key, sends notification + email.
- **Failure modes today (Gap G5):**
  - Failed payments (`vnp_ResponseCode != "00"`) throw and persist **nothing**.
  - Pending payments live only in Redis and evaporate after 15 minutes.
  - A user refreshing the return URL re-runs `processPayment` if the Redis key still exists
    (double plan extension) — no idempotency key anywhere.
  - `user_plans` is mutable (`active`, `notified` flipped by the scheduler and by renewals),
    so it cannot serve as an audit-grade revenue source.
- **Dev infra:** `docker-compose.dev.yml` runs Mongo 7 only; prod `docker-compose.yml` runs
  Redis; backend runs on host, env via a sourced `.env`.

---

## 1. Decision & rationale

### D1 — PostgreSQL becomes the system of record for FINANCIAL data. MongoDB keeps everything else.

**The boundary, in one sentence: if a row represents money moving (or attempting to move), it
lives in Postgres; if it represents application/document state, it lives in Mongo.**

| Data | Store | Why |
|---|---|---|
| `payment_transactions` (immutable ledger, every VNPay attempt) | **Postgres** (source of truth) | ACID, real unique constraints for idempotency, append-only enforceable at the DB layer, SQL aggregation for revenue reporting, mature backup/PITR story |
| `subscription_events` (plan lifecycle: purchase/renewal/expiry/downgrade) | **Postgres** | Financial-adjacent audit trail; explains *why* a user's plan is what it is |
| `user_plans` (current subscription state) | **Mongo** (read-model / projection) | See D2 |
| `users`, `boards`, `templates`, `app_config`, `config_audit`, notifications | **Mongo** (unchanged) | Document-shaped app data; no change |
| Pending-payment handshake (15-min `PaymentRequest`) | Redis (unchanged) **plus** a `PENDING` ledger row in Postgres | Redis stays the fast lookup; Postgres row makes the attempt durable |

Why Postgres for finance specifically (not "Mongo with discipline"):

1. **Idempotency needs a database-enforced unique constraint with transactional semantics.**
   VNPay return-URL hits can be replayed (browser refresh, back button); a `UNIQUE` index +
   `INSERT ... ON CONFLICT` gives an atomic claim-check that Mongo upserts approximate but
   application code has historically not implemented here (there is none today).
2. **Append-only is enforceable**: `REVOKE UPDATE, DELETE` on the ledger table for the app
   role, plus a trigger guard. In Mongo, immutability is a convention any `save()` can break —
   exactly the bug class we have now (renewals mutating `user_plans` in place).
3. **Finance queries are relational**: revenue by day/plan/status, refund reconciliation,
   month-end closes — `SUM ... GROUP BY ... WHERE created_at BETWEEN` with indexes, views for
   the dashboard, and later a BI tool pointed at replicas.
4. **Audit posture**: WAL-based PITR, `pg_dump` per-table, and a schema migration history
   (Flyway) reviewable in git — the finance record's shape is itself version-controlled.

This is deliberate **polyglot persistence with a hard boundary**, not a creeping migration:
nothing outside `finance` package/schema may write to Postgres; nothing in `finance` may be the
source of truth in Mongo.

### D2 — `user_plans` STAYS in Mongo as a projection/read-model. It does NOT move to Postgres (now).

Decision: **keep Mongo `UserPlans`; the Postgres ledger is the source of truth for financial
history, and `user_plans` becomes a derived view of "current entitlement".**

Justification:

- **Coupling:** `UserPlans` is read on hot user-facing paths (`User.userPlansId`, the
  `@Scheduled` expiry job, plan gating for boards/templates). Moving it to Postgres forces a
  cross-store join on every entitlement check and drags half the user domain into JPA — a big,
  risky change with no finance benefit.
- **Semantics differ:** the ledger answers "what money moved, when, with what outcome"
  (immutable, grows forever); `user_plans` answers "what can this user do right now" (mutable
  by design — `active`, `notified`, expiry downgrades). Forcing one table to be both is what
  created Gap G5. Two representations with one authoritative source is the correct shape.
- **Rebuildability is the test of a projection:** after this design, `user_plans` current
  state must be derivable from the ledger + `subscription_events` (replay). A weekly
  reconciliation job (§5) asserts this. If drift is ever found, the ledger wins.
- **Revisit trigger:** if/when finance features need transactional writes to subscription
  state (refunds that revoke entitlement atomically, proration), move `user_plans` to Postgres
  then — Phase F5 (optional) in the rollout plan covers it. Not before.

---

## 2. Data model — Postgres schema

One dedicated database `mobidrawer_finance` (not a schema inside a shared DB — isolates
backup/restore and credentials), owned by role `finance_owner`; the app connects as
`finance_app` with table-level grants only.

### 2.1 DDL sketch (Flyway `V1__create_payment_ledger.sql`)

```sql
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

-- Immutable append-only ledger: one row per VNPay payment ATTEMPT.
CREATE TABLE payment_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(24)    NOT NULL,          -- Mongo ObjectId hex; no FK (cross-store)
    plan            VARCHAR(20)    NOT NULL,          -- Plans enum name: FREE/PRO/ENTERPRISE
    amount          BIGINT         NOT NULL CHECK (amount >= 0),  -- minor units (VND, no decimals)
    currency        CHAR(3)        NOT NULL DEFAULT 'VND',
    vnp_txn_ref     VARCHAR(32)    NOT NULL,
    status          payment_status NOT NULL,
    vnp_response_code VARCHAR(4),                     -- '00' on success; NULL while PENDING
    raw_callback    JSONB,                            -- full VNPay param map (see §7 ESCALATE)
    order_info      TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    -- Terminal-state bookkeeping: the PENDING row is UPDATEd exactly once to a terminal
    -- status (see design notes below); finalized rows are immutable via trigger.
    finalized_at    TIMESTAMPTZ,
    CONSTRAINT uq_vnp_txn_ref UNIQUE (vnp_txn_ref)
);

CREATE INDEX idx_pt_user_created ON payment_transactions (user_id, created_at DESC);
CREATE INDEX idx_pt_status_created ON payment_transactions (status, created_at DESC);
CREATE INDEX idx_pt_created ON payment_transactions (created_at);  -- date-range dashboard queries

-- Subscription lifecycle audit (append-only, no updates ever)
CREATE TABLE subscription_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(24)    NOT NULL,
    event_type      VARCHAR(20)    NOT NULL,  -- PURCHASE | RENEWAL | EXPIRY | DOWNGRADE
    plan            VARCHAR(20)    NOT NULL,
    payment_txn_id  UUID REFERENCES payment_transactions(id),  -- NULL for EXPIRY/DOWNGRADE
    effective_from  TIMESTAMPTZ    NOT NULL,
    effective_to    TIMESTAMPTZ,              -- computed expiry at event time
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_se_user ON subscription_events (user_id, created_at DESC);

-- Enforce append-only at the DB layer:
REVOKE DELETE ON payment_transactions, subscription_events FROM finance_app;
REVOKE UPDATE ON subscription_events FROM finance_app;
-- payment_transactions allows exactly ONE update: PENDING -> terminal. Guarded by trigger:
CREATE FUNCTION guard_ledger_update() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'PENDING' THEN
    RAISE EXCEPTION 'payment_transactions rows are immutable once finalized (id=%)', OLD.id;
  END IF;
  IF NEW.id <> OLD.id OR NEW.vnp_txn_ref <> OLD.vnp_txn_ref
     OR NEW.amount <> OLD.amount OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'identity/amount fields of a ledger row may never change';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_guard_ledger BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION guard_ledger_update();
```

Design notes:

- **"Append-only" defined precisely:** a payment attempt is one row. It is INSERTed as
  `PENDING` at URL-creation time and receives exactly one UPDATE to a terminal status
  (`SUCCESS`/`FAILED`) at callback time, or `EXPIRED` by a sweeper. After `finalized_at` is
  set, the trigger makes the row immutable. No row is ever deleted. This is simpler and more
  queryable than event-per-status rows while keeping the audit guarantee (identity and amount
  can never change — the trigger blocks it even pre-finalization).
- **`vnp_txn_ref` UNIQUE is the idempotency key** (§5). Today's `getRandomNumber(8)` can
  collide; the unique constraint converts a silent collision into a retryable error at
  URL-creation — the service must regenerate on conflict (small code change, Sprint F2).
- **`amount BIGINT` in VND minor units** matches the existing `long amount`. No floating point,
  ever. `currency` future-proofs without committing to multi-currency logic.
- **No FK to Mongo users** — `user_id` is an opaque 24-char ObjectId hex. Referential integrity
  across stores is handled by the reconciliation job, not constraints.
- **Dashboard view** (Flyway `V2`): `CREATE VIEW revenue_daily AS SELECT date_trunc('day',
  created_at) d, plan, status, count(*) n, sum(amount) revenue FROM payment_transactions
  GROUP BY 1,2,3;` — Sprint F3's API reads this.

---

## 3. Spring Boot integration — Mongo + JPA in one app

### 3.1 Dependencies (`IE213Backend/pom.xml`)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
    <exclusions><exclusion>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-logging</artifactId>
    </exclusion></exclusions>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

Versions are managed by the Boot 3.4.13 parent (Hibernate 6.6, Flyway 10.x, HikariCP) — all
run fine on JDK 25; no version pins needed. Follow the project convention of excluding
`spring-boot-starter-logging` (log4j2 is the chosen backend).

**Migration tooling: Flyway** (not Liquibase) — plain-SQL migrations reviewed in git match a
finance schema's audit needs better than XML changelogs, and Boot auto-runs it at startup
against the (single) SQL datasource. Location: `src/main/resources/db/migration`.

### 3.2 Configuration (`application.properties` + env)

```properties
# --- Finance datasource (PostgreSQL) ---
spring.datasource.url=${POSTGRES_URL:jdbc:postgresql://localhost:5432/mobidrawer_finance}
spring.datasource.username=${POSTGRES_USER:finance_app}
spring.datasource.password=${POSTGRES_PASSWORD}
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.pool-name=finance-pool
spring.jpa.hibernate.ddl-auto=validate          # Flyway owns the schema; Hibernate only validates
spring.jpa.open-in-view=false                   # never hold a SQL connection across web requests
spring.flyway.locations=classpath:db/migration
```

Secrets stay env-only (same rule as VNPay/JWT creds — admin-tool NFR).

### 3.3 Repository slicing

Because both Spring Data modules are on the classpath, **repository interfaces must be
partitioned by package** or both modules will try to claim every interface (Boot logs
"Multiple Spring Data modules found" and falls back to strict-mode guessing):

```java
@Configuration
@EnableMongoRepositories(basePackages = "com.example.ie213backend.repository")        // existing
@EnableJpaRepositories(basePackages  = "com.example.ie213backend.finance.repository") // new
@EnableTransactionManagement
public class PersistenceConfig { }
```

New code lives under `com.example.ie213backend.finance.{domain,repository,service}`:
`PaymentTransaction` `@Entity`, `PaymentTransactionRepository extends JpaRepository`,
`LedgerService`. Existing Mongo repositories are untouched. `@Transactional` defaults to the
JPA `PlatformTransactionManager` (the only one registered — Mongo ops here don't use
transactions today, so no `transactionManager` qualifier gymnastics are needed; if Mongo
transactions are ever introduced, name the managers explicitly).

### 3.4 Transaction boundaries — the dual-write at the VNPay callback

**There is no XA / distributed transaction** (deliberately — JTA across Mongo+Postgres is
operational pain for zero benefit at this scale). Instead: **write-ledger-first ordering with
idempotency, treating Mongo as a retryable projection.**

Callback flow (`validPayment` → new `LedgerService.finalize(...)`):

```
1. Verify vnp_SecureHash (unchanged).
2. POSTGRES TX A (the claim):
     UPDATE payment_transactions
        SET status = :terminal, vnp_response_code = :rc,
            raw_callback = :json, finalized_at = now()
      WHERE vnp_txn_ref = :ref AND status = 'PENDING'
   - 0 rows updated & existing row is terminal  → duplicate callback → return the
     previously-computed result (idempotent no-op; do NOT touch Mongo again).
   - 0 rows & no row exists → attempt unknown (Redis-era orphan) → INSERT the terminal row
     (ON CONFLICT DO NOTHING re-checks the race), then continue.
   - COMMIT. The financial fact is now durable regardless of anything downstream.
3. If status == SUCCESS: apply the Mongo projection (existing processPayment logic:
   deactivate old UserPlans, insert new, update User) + INSERT subscription_events row
   (Postgres TX B) + notification/email.
4. If step 3 fails: the ledger row is already SUCCESS — log at ERROR with vnp_txn_ref and
   rely on the projection-repair sweeper (below). The user may briefly not see the plan;
   money is never lost or double-counted.
```

**Projection repair instead of an outbox:** a full transactional-outbox + relay is overkill
when the "downstream" is our own Mongo in the same process. Instead, a `@Scheduled` sweeper
(reusing the existing scheduler pattern in `VNPayServiceImpl`) every 5 minutes selects
`SUCCESS` ledger rows with no matching `subscription_events` row and re-applies the projection
(the apply is itself idempotent: keyed by `payment_txn_id`). This gives outbox-grade eventual
consistency with one table and zero new infrastructure. If a real message broker ever arrives,
swap the sweeper for an outbox relay — the schema already supports it.

**URL-creation flow** gains one write: after generating a non-colliding `vnp_TxnRef` (retry on
unique-violation), `INSERT payment_transactions (status='PENDING', ...)` **before** returning
the redirect URL. Redis keeps its role (fast 15-min handshake), but the durable record no
longer depends on it. A daily sweeper marks `PENDING` rows older than 24h as `EXPIRED`
(the one status transition the trigger permits).

---

## 4. Local dev & production

### 4.1 `docker-compose.dev.yml` addition

```yaml
  postgres:
    image: postgres:17
    container_name: mobidrawer-postgres-dev
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mobidrawer_finance
      POSTGRES_USER: finance_app
      POSTGRES_PASSWORD: finance_dev        # dev only; prod uses env/secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U finance_app -d mobidrawer_finance"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

Dev loop unchanged: `docker compose -f docker-compose.dev.yml up -d`, backend on host with
`.env` supplying `POSTGRES_URL/USER/PASSWORD`. Flyway migrates on boot — no manual step.

### 4.2 Production

- Add the same `postgres:17` service to `docker-compose.yml` (named volume on host disk, or —
  strongly preferred, see §7 — a managed Postgres). `restart: always` to match Redis.
- Env vars injected the same way as existing secrets. The app fails fast at startup if
  Postgres is unreachable (Flyway) — acceptable and desirable for a finance datastore; do
  **not** make the datasource lazy/optional.
- JDK 25 / Boot 3.4.13: no compatibility concerns — PostgreSQL JDBC 42.7.x, Hibernate 6.6, and
  Flyway 10 are all JDK-25-clean and managed by the Boot BOM.
- Backups: nightly `pg_dump` of `mobidrawer_finance` at minimum; PITR if managed Postgres
  (§7 — DBA sign-off).

---

## 5. Idempotency & correctness

1. **Dedupe key = `vnp_txn_ref` with a DB UNIQUE constraint.** Every callback replay (browser
   refresh of `/valid-payment`, VNPay retry if an IPN is ever added) resolves to the same
   ledger row; the `status='PENDING'` guard in the UPDATE means only the *first* callback
   transitions it, atomically. Replays return the stored outcome without re-running the Mongo
   projection — this also fixes today's double-plan-extension bug for free.
2. **Append-only enforced three ways:** (a) app role has no DELETE grant and no UPDATE on
   `subscription_events`; (b) the trigger rejects any UPDATE of a finalized ledger row and any
   change to identity/amount fields; (c) code review rule — no JPA entity method mutates a
   finalized row (entity marks those fields `updatable = false`).
3. **Failed and expired attempts are first-class rows** — the FAILED path in `validPayment`
   currently just throws; it will now finalize the row as `FAILED` with the response code
   *before* throwing, so the dashboard finally sees failure rates (a stated D3 gap).
4. **Auditability:** `raw_callback JSONB` preserves the exact signed VNPay parameter map for
   dispute resolution (retention/PII — see §7 ESCALATE); `created_at`/`finalized_at` are
   server-clock `TIMESTAMPTZ`; Flyway history documents every schema change.
5. **Reconciliation job (weekly, `@Scheduled`):** replays the ledger + `subscription_events`
   per user and compares to Mongo `user_plans`/`User.plan`; mismatches are logged as ERROR
   with both values (ledger wins; auto-repair only for the "missing projection" case, human
   review otherwise). This is the standing proof that the projection claim in D2 holds.

---

## 6. Migration & rollout plan (harness sprints)

Phased so every step is releasable and non-breaking. All backend. Ordered; F3 depends on F2;
F4 can run parallel to F3.

### Sprint F1 — BACKEND: Postgres foundation (infra + schema, zero behavior change)
- pom.xml deps (JPA, postgresql, Flyway), `PersistenceConfig` repo slicing, datasource props,
  Flyway `V1` (tables, enum, trigger, grants) + `V2` (revenue view), `docker-compose.dev.yml`
  + prod compose service, `.env.example` entries, `PaymentTransaction`/`SubscriptionEvent`
  entities + repositories (unused yet). App boots with both stores; all existing tests pass.
- **Size:** ~8–10 files · ACs: boot succeeds with/without existing data, Flyway `validate`
  clean, Mongo repositories still resolve (no cross-module claiming), no secret in git.

### Sprint F2 — BACKEND: Ledger dual-write at payment flow (the correctness fix)
- URL-creation: retry-on-conflict `vnp_TxnRef` generation + `PENDING` insert.
  Callback: write-ledger-first finalize (SUCCESS/FAILED) per §3.4, idempotent replay handling
  (duplicate callback returns prior outcome, Mongo untouched), FAILED rows persisted,
  `subscription_events` written alongside the (unchanged) Mongo projection, projection-repair
  sweeper + `PENDING→EXPIRED` sweeper. **Non-breaking:** Mongo `user_plans` writes unchanged;
  admin Sprint 4 revenue API (Mongo aggregation) keeps working.
- **Size:** ~7–10 files · ACs: replayed callback does not extend plan twice; FAILED persisted;
  ledger row exists before any Mongo write on success; trigger blocks post-finalize update;
  sweeper repairs an injected missing projection.

### Sprint F3 — BACKEND: Revenue dashboard reads move to Postgres
- Reimplement `GET /api/v1/admin/stats/revenue` + transaction list on `payment_transactions`
  (view-backed): totals, group-by plan, success/failure counts, exact per-transaction history
  including renewals — retiring the D3 "count ≈ purchases" UI caveat. Response metadata gains
  `source: "ledger"` + ledger start date (pre-ledger history still summarized from
  `user_plans` — clearly labeled, or backfilled by F4 first if sequencing allows).
- **Size:** ~5–7 files · ACs: figures match ledger fixtures; date-range filter on `created_at`;
  no password hash in any payload; USER token → 403.

### Sprint F4 — BACKEND: Backfill + reconciliation
- One-shot idempotent backfill: each historical `user_plans` doc → one `SUCCESS` ledger row
  (`vnp_txn_ref = orderCode`, flagged `raw_callback = NULL`, `order_info='BACKFILL'`) +
  `subscription_events` PURCHASE row. Weekly reconciliation job (§5.5). After backfill, F3
  drops the dual-source labeling.
- **Size:** ~4–6 files · ACs: backfill idempotent (re-run = no dupes, thanks to the unique
  key), ledger totals == Mongo aggregation totals for the historical window, reconciler flags
  an injected drift.

### Sprint F5 (OPTIONAL, backlog): Move `user_plans` to Postgres
- Only pulled in if refunds/proration/entitlement-atomicity land on the roadmap (D2 revisit
  trigger). Until then, explicitly NOT scheduled.

Sequencing vs the admin-tool roadmap: F1 is unblocked today and independent of admin Sprints
1–7. F3 supersedes part of admin Sprint 4 — if Sprint 4 has already shipped, F3 is a drop-in
re-implementation behind the same endpoint contract; if not, do F1–F2 first and let Sprint 4
target Postgres directly (saves a rewrite — recommend this ordering to the PO).

**Total: 4 sprints (all backend) + 1 optional.**

---

## 7. Risks & items needing the human / DBA

| # | Risk / decision | Owner | Notes |
|---|---|---|---|
| R1 | **ESCALATE — `raw_callback` PII/PCI-adjacent data.** VNPay return params include bank code, card-type hints, order info that may contain user-entered text. Storing the full map is the right audit default, but retention period, access control (admin only? DBA only?), and whether any field must be masked need a human/compliance call **before F2 ships**. Cheap mitigations available: strip `vnp_SecureHash`, column-level `pgcrypto` encryption, N-year retention policy. | Human/PO + compliance | Blocks nothing in F1 |
| R2 | **ESCALATE — production Postgres hosting & backups.** Self-hosted container-on-volume vs managed (RDS/Cloud SQL/DO). For financial data I recommend managed with PITR; a docker volume with nightly `pg_dump` is the floor, not the target. Needs budget sign-off. | Human + DBA | Decide by F1 prod deploy |
| R3 | Connection pool sizing: Hikari max 10 proposed; DBA must confirm Postgres `max_connections` headroom once other consumers (BI, admin tool direct reads?) appear. | DBA | Config-only change |
| R4 | No VNPay IPN endpoint exists — the return URL is the only callback, so an abandoned browser = payment succeeded at VNPay but `PENDING` forever on our side. The `EXPIRED` sweeper + (recommended, small follow-up) VNPay querydr API check via `vnp.api.url` before expiring closes this. Flag as a fast-follow after F2. | Architect → PO | Ledger makes the gap *visible*, which it never was |
| R5 | Dual-module Spring Data misconfiguration (repos claimed by wrong module) breaks boot. Mitigated by explicit `basePackages` in F1 + an AC that asserts both a Mongo and a JPA repo resolve. | F1 contract | |
| R6 | Backfill quality: historical `user_plans` lack failure records and mutated renewals — backfilled history is best-effort and flagged as such (`order_info='BACKFILL'`). Dashboard must not present pre-ledger failure rates. | F4 contract | |
| R7 | App startup now hard-depends on Postgres availability (Flyway). Accepted deliberately for a finance store; document in runbook. | Runbook | |

---

## Decision log

- Postgres = system of record for money; Mongo keeps app/document data. Boundary: "money
  moving → SQL". (Human-locked; design ratifies.)
- `user_plans` stays Mongo as a rebuildable projection; ledger wins on drift. Revisit only for
  refunds/proration (F5).
- One-row-per-attempt ledger with single PENDING→terminal transition, DB-enforced immutability
  (grants + trigger), `vnp_txn_ref` UNIQUE as the idempotency key.
- No XA, no outbox infrastructure: write-ledger-first + idempotent projection + repair sweeper.
- Flyway over Liquibase; dedicated `mobidrawer_finance` database; secrets env-only.
- 4 backend sprints (F1 foundation → F2 dual-write → F3 dashboard reads → F4 backfill/reconcile),
  F5 optional. Recommend re-sequencing admin Sprint 4 to target Postgres if it hasn't shipped.
