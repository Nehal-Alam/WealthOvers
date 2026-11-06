# WEALTHOVERS V2 — KNOWN ISSUES & TECHNICAL DEBT REGISTER

**Last Updated:** November 2026 (Phase 0 Audit)  
**Status:** Monitored & Scheduled for Remediation across Phases 1–7  

---

## 1. High-Priority Technical Debt & Defects

### 1.1 Trigger vs Application Balance Double-Mutation Hazard (DEF-01)
* **Status:** Identified in Phase 0 audit. Scheduled for resolution in Phase 2.
* **Impact:** In V1, both `trg_sync_account_balance` (database trigger) and `FinancialTransactionService.deleteFinancialTransaction` (TypeScript service) alter `accounts.current_balance` on deletion, causing balance subtractions to be executed twice.
* **Remediation Plan:** Apply migration `20261107040000_harmonize_account_balance_triggers.sql` to drop the trigger and assign authoritative balance mutation exclusively to `FinancialTransactionService`.

### 1.2 Android Sync API Edge Middleware Blocking (DEF-02)
* **Status:** Identified in Phase 0 audit. Scheduled for resolution in Phase 6.
* **Impact:** `lib/supabase/middleware.ts` intercepts all requests without a user session cookie and redirects them to `/login`, blocking companion Android apps from calling `/api/v1/transactions/sync`.
* **Remediation Plan:** Whitelist `path.startsWith("/api/v1/")` in `middleware.ts` to allow token-authenticated companion devices to reach the API.

### 1.3 Missing Stored Procedure in SQL Migrations (DEF-03)
* **Status:** Identified in Phase 0 audit. Scheduled for resolution in Phase 2 / 6.
* **Impact:** The stored procedure `sync_android_transactions` was created directly in Supabase without a corresponding SQL migration file in the repository.
* **Remediation Plan:** Commit `20261107000000_android_sync_rpc.sql` into `supabase/migrations/` to guarantee repeatable local and staging builds.

### 1.4 Dashboard Summary RPC Net Worth Discrepancy (DEF-04)
* **Status:** Identified in Phase 0 audit. Scheduled for resolution in Phase 2.
* **Impact:** The SQL RPC `get_dashboard_summary` only computes $Liquid - Credit$, omitting investments, physical assets, loans, and external liabilities.
* **Remediation Plan:** Deploy `20261107010000_v2_dashboard_summary_rpc.sql` to align the SQL RPC with the complete `calculateNetWorth` formula.

---

## 2. External Integration Constraints

### 2.1 Native Android Companion Application
* **Constraint:** Web browsers cannot directly read Android SMS inboxes or system notifications due to OS sandbox security.
* **Architecture:** Requires an opt-in native companion APK running on the user's Android device. The companion pairs securely via a 64-character token and transmits pre-sanitized metadata to `/api/v1/transactions/sync`.

### 2.2 Live Stock Market Price Feeds
* **Constraint:** Live real-time market data APIs (NSE/BSE/Yahoo Finance WebSockets) require paid third-party API credentials.
* **Architecture:** In V2, investment valuations will be powered by `public.currency_exchange_rates` and periodic portfolio price updates with clear timestamp indicators (`last_price_update_at`). Market prices are never fabricated or guessed.

### 2.3 Bank Statement PDF Parsing
* **Constraint:** Password-protected or scanned image PDFs cannot be parsed with simple text extractors and require user entry of passwords or net-banking CSV downloads.
* **Architecture:** V2 provides instant CSV/Excel parsing with duplicate detection, while non-parseable PDFs present a clear guide for exporting CSVs directly from banking portals.

