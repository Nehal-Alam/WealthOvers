# WEALTHOVERS V2 — SYSTEM RISK REGISTER & MITIGATION MATRIX

**Lead Architect:** Principal Architect (Agent 1)  
**Security & Deployment Lead:** Agent 10  
**Status:** Active Risk Management  

---

## 1. Risk Matrix Overview

Risks are categorized across Financial Integrity, Database Operations, AI Safety, System Security, Performance, and User Experience:

```
    CRITICAL |  [R-01]  [R-02]  [R-03]
             |
      HIGH   |  [R-04]  [R-05]  [R-06]
  I          |
  M  MEDIUM  |  [R-07]  [R-08]  [R-09]
  P          |
  A   LOW    |  [R-10]
  C          +---------------------------------
  T              LOW     MEDIUM    HIGH
                     LIKELIHOOD
```

---

## 2. Comprehensive Risk Catalog

### R-01: Database Trigger vs Application Balance Double-Mutation
* **Category:** Financial Integrity / Accounting
* **Severity:** **P0 (Critical)** | **Likelihood:** Medium | **Impact:** Critical
* **Description:** In V1, both the PostgreSQL trigger `trg_sync_account_balance` and `FinancialTransactionService.deleteFinancialTransaction` adjust account balances during deletion, causing balance subtractions to be executed twice.
* **Root Cause:** Dual uncoordinated balance mutation logic existing simultaneously in PostgreSQL stored triggers and Next.js server actions.
* **Mitigation Strategy:**
  - Apply migration `20261107040000_harmonize_account_balance_triggers.sql` dropping `trg_sync_account_balance`.
  - Establish `FinancialTransactionService` as the single, authoritative balance updater.
  - Assert that all account balance mutations are derived from `public.ledger_entries`.
* **Owner:** Financial Accounting Specialist (Agent 5)
* **Monitoring:** Unit test asserting single-subtraction on deletion; account balance reconciliation checks.

---

### R-02: Missing Stored Procedure in SQL Migrations (`sync_android_transactions`)
* **Category:** Database / Ingestion
* **Severity:** **P0 (Critical)** | **Likelihood:** High | **Impact:** High
* **Description:** The Android sync route `/api/v1/transactions/sync` depends on the RPC `sync_android_transactions`, which was omitted from checked-in SQL migrations. Any fresh local or staging database restore will fail when receiving sync requests.
* **Root Cause:** Unversioned procedure created directly in the Supabase console without committing to the migration pipeline.
* **Mitigation Strategy:**
  - Author and commit `20261107000000_android_sync_rpc.sql` containing the full, hardened PL/pgSQL function.
  - Enforce CI pipeline rule that all Supabase RPC calls must correspond to versioned migrations.
* **Owner:** Database Specialist (Agent 4)
* **Monitoring:** Migration replay tests on fresh PostgreSQL instance.

---

### R-03: Edge Middleware Blocking Token-Authenticated Device Ingestion
* **Category:** Ingestion / Routing
* **Severity:** **P0 (Critical)** | **Likelihood:** High | **Impact:** High
* **Description:** `lib/supabase/middleware.ts` intercepts all requests without a user browser cookie and redirects them to `/login`. This completely blocks Android companion requests from reaching `/api/v1/transactions/sync`.
* **Root Cause:** Omission of `/api/v1/` from the middleware's public route whitelist.
* **Mitigation Strategy:**
  - Modify `middleware.ts` to whitelist `path.startsWith("/api/v1/")`.
  - Ensure downstream route handlers rigorously validate `X-Device-Id` and `X-Device-Token` headers.
* **Owner:** Deployment and Security Specialist (Agent 10)
* **Monitoring:** Automated integration test making curl/fetch requests with device headers without cookies.

---

### R-04: Discrepancy Between Dashboard Summary RPC and Net Worth Formula
* **Category:** Financial Accuracy
* **Severity:** **P1 (High)** | **Likelihood:** High | **Impact:** High
* **Description:** `get_dashboard_summary` computes net worth as $v\_liquid - v\_credit$, ignoring investments, physical assets, loans, and personal liabilities, leading to a major discrepancy between the dashboard and `/net-worth`.
* **Root Cause:** Initial SQL RPC implementation only aggregated liquid accounts and credit cards.
* **Mitigation Strategy:**
  - Deploy migration `20261107010000_v2_dashboard_summary_rpc.sql` to include all asset and liability classes.
  - Harmonize client-side math and server-side RPC so metrics are mathematically identical.
* **Owner:** Wealth Management Specialist (Agent 6) & Database Specialist (Agent 4)
* **Monitoring:** Dashboard invariant test comparing client calculation vs RPC output.

---

### R-05: Hardcoded Foreign Exchange Rate (`DEFAULT_USD_INR_RATE = 84.5`)
* **Category:** Wealth Management / Currency
* **Severity:** **P1 (High)** | **Likelihood:** High | **Impact:** Medium
* **Description:** US stock portfolios and foreign currency holdings are converted using a hardcoded static constant, leading to inaccurate valuations as currency markets fluctuate.
* **Root Cause:** Hardcoded constant in `lib/calculations/financial.ts` without dynamic rate management.
* **Mitigation Strategy:**
  - Introduce `public.currency_exchange_rates` table via migration `20261107030000_currency_rates.sql`.
  - Refactor valuation calculations to query the latest effective exchange rate.
  - Display valuation timestamps and exchange rate sources transparently in the UI.
* **Owner:** Wealth Management Specialist (Agent 6)
* **Monitoring:** Currency conversion tests; rate freshness telemetry.

---

### R-06: LLM Arbitrary SQL Injection & Autonomous Mutation Risk
* **Category:** AI Safety & Security
* **Severity:** **P1 (High)** | **Likelihood:** Low | **Impact:** Critical
* **Description:** If an LLM assistant is granted raw SQL execution or autonomous database mutation powers, prompt injection could compromise user balances or leak cross-tenant data.
* **Root Cause:** Poorly isolated agent designs that pass raw prompts directly to database query builders.
* **Mitigation Strategy:**
  - Grant the AI assistant strictly **read-only, structured tool execution** via predefined TypeScript services.
  - Bar the LLM from executing raw SQL or invoking mutation endpoints.
  - Strip PII and mask account numbers before passing context to LLM providers.
* **Owner:** AI Architect (Agent 7)
* **Monitoring:** Automated security penetration tests attempting prompt injection and unauthorized tool execution.

---

### R-07: Production Data Loss During Migration
* **Category:** Database Operations
* **Severity:** **P2 (Medium)** | **Likelihood:** Low | **Impact:** Critical
* **Description:** Running non-backward-compatible migrations on production could alter or drop existing user transactions or account balances.
* **Root Cause:** Destructive DDL statements (`DROP COLUMN`, `RENAME TABLE`, or unverified default value overwrites).
* **Mitigation Strategy:**
  - Enforce strictly additive migrations (`IF NOT EXISTS`, `CREATE OR REPLACE`).
  - Take a full physical database snapshot prior to production migration execution.
  - Execute and verify migrations on staging branch before touching production.
* **Owner:** Database Specialist (Agent 4) & Principal Architect (Agent 1)
* **Monitoring:** Pre- and post-migration record count and checksum verification.

---

### R-08: Serverless Function Timeout on Large Statement Imports
* **Category:** Infrastructure / Performance
* **Severity:** **P2 (Medium)** | **Likelihood:** Medium | **Impact:** Medium
* **Description:** Parsing large PDF or Excel files with thousands of rows may exceed Vercel serverless function execution limits (10s on hobby, 60s on pro).
* **Root Cause:** Monolithic synchronous statement parsing in a single server action request.
* **Mitigation Strategy:**
  - Configure `maxDuration: 60` in `vercel.json` for statement import routes.
  - Enforce a 4.5 MB file upload guardrail on the client and server.
  - Process batches asynchronously using `import_jobs` status polling if needed.
* **Owner:** Performance Specialist (Agent 9)
* **Monitoring:** Upload error tracking; execution duration telemetry.

---

### R-09: Mobile Viewport Density Regressions
* **Category:** User Experience / Mobile
* **Severity:** **P2 (Medium)** | **Likelihood:** Medium | **Impact:** Medium
* **Description:** Bloomberg-style terminal density can result in unreadable micro-text, horizontal scrolling, and overlapping touch targets on small mobile screens.
* **Root Cause:** Direct porting of multi-column desktop tables to mobile viewports without responsive adaptation.
* **Mitigation Strategy:**
  - Transform wide data tables into compact, stacked 2-line financial list cards on mobile ($< 768\text{px}$).
  - Implement bottom sheet navigation with 48px minimum touch targets.
  - Audit all pages at 375px viewport width.
* **Owner:** UI/UX Design Specialist (Agent 2) & Frontend Specialist (Agent 3)
* **Monitoring:** Responsive viewport tests across mobile breakpoints.

---

### R-10: Test Runner Concurrency Jitter (Micro-Benchmark Failure)
* **Category:** Quality Assurance
* **Severity:** **P3 (Low)** | **Likelihood:** Medium | **Impact:** Low
* **Description:** High CPU core utilization during concurrent collection of 28 Vitest suites can cause 1,000-record aggregation benchmarks to run in 52ms against a 50ms assertion, breaking CI pipelines intermittently.
* **Root Cause:** Uncalibrated timing assertions running concurrently with heavy Vite transform threads.
* **Mitigation Strategy:**
  - Add JIT warm-up cycles and raise concurrent test threshold to 100ms.
  - Isolate dedicated performance benchmarks into a separate `npm run test:perf` suite.
* **Owner:** QA and Testing Specialist (Agent 8)
* **Monitoring:** CI test run stability metrics.

---

## 3. Summary of Risk Ownership & Review Cadence

All risks listed above are reviewed at the conclusion of every implementation phase. No release gate will be passed while any P0 or P1 risk remains unmitigated.

