# WEALTHOVERS V1 — EXHAUSTIVE SYSTEM & ARCHITECTURAL AUDIT

**Target Platform:** [https://wealthovers.vercel.app/](https://wealthovers.vercel.app/)  
**Auditor:** Principal Software Architect & Multi-Agent Orchestration Lead  
**Audit Date:** November 2026  
**Stack Baseline:** Next.js 15.5.28 (App Router), React 18.3.1, TypeScript 5.6.3, Tailwind CSS 3.4.15, Supabase PostgreSQL 15 (with RLS), Decimal.js 10.4.3  

---

## 1. Executive Summary

WealthOvers V1 was developed as an individual wealth and expense management application. This audit examines every subsystem of the codebase, covering all 32 App Router routes, 32 database tables, transaction mechanics, financial calculation math, security boundaries, client-side/server-side execution paths, and integration surfaces.

### Key Audit Verdict
- **Core Financial Mathematics:** **Strong & Robust.** Fixed-point arithmetic using `Decimal.js` (28-digit precision) is consistently enforced across unit calculators, loan amortization, XIRR, and net worth formulas.
- **Double-Entry Ledger:** **Partially Unified.** A dedicated `ledger_entries` table exists with balanced debit/credit requirements; however, a critical race condition and double-mutation hazard exists between legacy PostgreSQL triggers and modern TypeScript application services.
- **Visual Design System:** **Divergent.** V1 implemented a "Leftovers"-inspired warm ivory/pine/sage palette (`#F7F7F0` / `#151C18`), which contradicts the V2 vision of a data-dense, professional Bloomberg financial terminal (`#101820` / `#18232D` with amber/emerald indicators).
- **Intelligence & AI:** **Not Implemented.** V1 relies solely on static rule-based heuristics (`generateDeterministicInsights`). There is no cloud AI gateway, no multi-provider LLM integration, and no structured conversational financial tooling.
- **Automation & Ingestion:** **Broken in Production Deployment.** The Android synchronization route (`/api/v1/transactions/sync`) is blocked by Next.js edge middleware redirecting non-cookie requests to `/login`, and the core database stored procedure (`sync_android_transactions`) is missing from checked-in SQL migrations.
- **Dependencies & Complexity:** **Dead Code Identified.** Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres`) is installed and configured in `lib/db/` but is never imported or used by any runtime route or component.

---

## 2. Framework & Dependencies Audit

### 2.1 Core Framework
- **Next.js Version:** `15.5.28` (App Router). Utilizing React 18.3.1 and React Server Components (RSC).
- **Build Status:** Passes production build cleanly (`next build` generates 32 static/dynamic routes in ~5s).
- **Type Safety:** 100% clean typecheck (`tsc --noEmit` exits with code 0).
- **Package Manager & Engines:** Node `>=22.0.0` declared in `package.json`.

### 2.2 Dependency Assessment Matrix

| Package | Version | Purpose | Audit Verdict | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `@supabase/ssr` & `@supabase/supabase-js` | `^0.5.2` / `^2.46.1` | Authentication, cookie sessions, database queries, RPCs | **Healthy & Essential** | Retain as primary data layer. |
| `decimal.js` | `^10.4.3` | Exact 28-digit fixed-point monetary math | **Critical & Flawless** | Keep across all financial services. |
| `drizzle-orm` & `drizzle-kit` | `^0.36.1` / `^0.28.1` | Secondary ORM abstraction | **Dead Code Bloat** | Never imported in `app/` or `components/`. Plan safe removal or explicit isolation. |
| `postgres` | `^3.4.5` | Native Postgres client for Drizzle | **Redundant** | Only instantiated in unused `lib/db/index.ts`. |
| `recharts` | `^2.13.3` | Financial data visualization | **Functional** | Requires dynamic SSR wrapping (`ssr: false`) to avoid hydration warnings. |
| `lucide-react` | `^0.460.0` | UI iconography | **Healthy** | Centralize icon imports. |
| `zod` | `^3.23.8` | Runtime validation for mutations & inputs | **Healthy & Comprehensive** | 15 schemas active in `lib/validations/`. |
| `zustand` | `^5.0.1` | Client UI state (sidebar, theme, privacy mask) | **Healthy** | Keep lightweight in `stores/ui-store.ts`. |
| `xlsx` & `pdf-parse` | `^0.18.5` / `^1.1.1` | Statement file extraction | **Functional** | Server action upload limited to 4.5 MB. |
| `vitest` | `^2.1.5` | Automated test runner | **Healthy** | 28 test files configured. |

---

## 3. Folder Structure & Architectural Layout

```
WealthOvers/
├── app/
│   ├── (auth)/             # Authentication routes (login, register, forgot-password, reset-password)
│   ├── (dashboard)/        # Protected financial modules (17 sub-routes)
│   ├── api/
│   │   ├── auth/callback/  # GoTrue OAuth / Magic Link PKCE exchange
│   │   └── v1/             # Android Sync & Device APIs
│   ├── globals.css         # CSS tokens and typography
│   ├── layout.tsx          # Root HTML layout and ThemeProvider
│   └── error.tsx           # Global error boundaries
├── components/
│   ├── accounts/           # Account management & running balance ledger
│   ├── assets/             # Fixed assets & personal liabilities
│   ├── budgets/            # Envelope budgeting & rollovers
│   ├── credit-cards/       # Revolving credit, statement cycles
│   ├── dashboard/          # Metric cards, net worth heroes
│   ├── devices/            # Android device pairing & sync simulator
│   ├── financial/          # Primitive MetricCard & MoneyDisplay
│   ├── goals/              # Milestones & target calculators
│   ├── import/             # Statement file parsers & preview
│   ├── insights/           # Deterministic charts & spending scrubber
│   ├── investments/        # Portfolios, holdings, SIP scheduler
│   ├── layout/             # Sidebar, Header, MobileNav, CommandMenu
│   ├── loans/              # Amortization, payments, EMI calculator
│   ├── net-worth/          # Asset allocation & net worth timeline
│   ├── plan/               # Multi-tab planning hub
│   ├── recurring/          # Bills dashboard & occurrence generator
│   ├── reports/            # Financial statements & CSV exports
│   ├── settings/           # Profile & theme toggles
│   ├── transactions/       # Unified transaction ledger & modal
│   └── ui/                 # Radix UI primitives
├── lib/
│   ├── calculations/       # Deterministic financial math (2,164 lines)
│   ├── data/               # React.cache() server-side cached queries
│   ├── db/                 # Drizzle schema (partially abandoned)
│   ├── parsers/            # CSV/Excel/PDF & duplicate detectors
│   ├── security/           # Device token hashing & zero-trust OTP filter
│   ├── services/           # FinancialTransactionService (1,359 lines)
│   ├── supabase/           # Server, Client, and Middleware initializers
│   └── validations/        # 15 Zod schema definitions
├── supabase/
│   └── migrations/         # 7 SQL migrations (PostgreSQL 15)
└── tests/                  # 28 Vitest test suites (239 tests)
```

---

## 4. Route-by-Route Deep Audit Matrix

| Route | Primary Component & Data Fetching | Status | Observed Defect or V1 Limitation | V2 Architecture Requirement |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | `DashboardClient`, `get_dashboard_summary` RPC | **Fully Implemented** | Net worth in RPC only subtracts credit cards; misses loans/assets. Visuals use soft card styling. | Transform into Bloomberg Command Centre with customizable financial widgets, real-time KPI ticker, and complete net worth. |
| `/net-worth` | `NetWorthView`, `calculateNetWorth` | **Fully Implemented** | Uses full formula, but diverges from dashboard summary RPC if loans/assets exist. | Harmonize calculation engine so dashboard and net worth page are mathematically identical. |
| `/transactions` | `TransactionLedger`, `FinancialTransactionService` | **Fully Implemented** | Filter bar lacks advanced multi-tag and multi-merchant search; UI is table-light. | Upgrade to high-density Bloomberg transaction grid with keyboard shortcuts, bulk reconciliation, and split visualizer. |
| `/accounts` | `AccountGrid`, `AccountHistoryModal` | **Fully Implemented** | Running balance ledger only loads on demand in modal; lack of institution logo badges. | Add inline running balance inspection, bank reconciliation workflows, and account grouping by liquidity. |
| `/categories` | `CategoryList`, `CategorizationRules` | **Fully Implemented** | Category hierarchy limited to 2 levels; tax-deductible flags not used in reporting. | Expand tax classification tags (Section 80C, 80D for India) and auto-rule simulation engine. |
| `/plan` | Multi-tab hub (`budgets`, `goals`, `recurring`, `calendar`) | **Fully Implemented** | Heavy page fetching 10 datasets; tab query parameters duplicate standalone routes. | Clean up navigation; maintain fast tab transitions and unified financial calendar. |
| `/budgets` | `BudgetView`, `CreateBudgetDialog` | **Fully Implemented** | Redundant route pointing to same component as `/plan?tab=budgets`. | Support direct route and embedded view seamlessly without duplicate maintenance. |
| `/goals` | `GoalsView`, `ContributeGoalDialog` | **Fully Implemented** | Standalone route also duplicated under `/plan?tab=goals`. | Streamline route hierarchy while preserving deep-link compatibility. |
| `/recurring` | `BillsDashboard`, `MarkBillPaidDialog` | **Fully Implemented** | Standalone route also duplicated under `/plan?tab=recurring`. | Retain occurrence scheduler and wire to automatic payment detection. |
| `/subscriptions` | Page redirecting to `/recurring` | **Stub / Redirect** | Pure redirect. No dedicated subscription tier or cancellation tracker. | Build dedicated Subscriptions tracker with renewal alerts, cadence breakdown, and cost per use. |
| `/investments` | `InvestmentPortfolioView`, `CreateSipDialog` | **Fully Implemented** | Exchange rate hardcoded at `84.5` INR/USD. No sub-tabs for Indian Stocks, US Stocks, Mutual Funds, Gold. | Add multi-asset categorization tabs, corporate actions, live valuation timestamps, and historical currency conversion. |
| `/credit-cards` | `CreditCardView`, `RecordPaymentDialog` | **Fully Implemented** | Lacks EMI-on-card conversion tracking and billing cycle calendar view. | Implement visual billing cycle calendar, unbilled transaction tracker, and debt payoff simulator. |
| `/loans` | `LoanView`, `LoanAmortizationModal` | **Fully Implemented** | Lacks foreclosure simulation and step-up EMI calculators. | Build interactive loan prepayment and foreclosure simulator with interest savings breakdown. |
| `/assets` | `AssetsLiabilitiesView`, `CreateAssetDialog` | **Fully Implemented** | Depreciation calculation is linear and not tracked chronologically. | Add valuation history timeline and link assets to amortizing loans (e.g. car loan against vehicle). |
| `/insights` | `InsightsView`, deterministic charts | **Fully Implemented** | Zero AI integration. Only deterministic rule heuristics. | Embed Cloud AI Finance Assistant, scenario analysis, and multi-month cash flow forecasting. |
| `/reports` | `ReportsView`, CSV Exporter | **Fully Implemented** | Lacks Excel/PDF generation and balance sheet statement formatting. | Build standard Personal Balance Sheet, Income Statement, and Cash Flow Statement with PDF/Excel exports. |
| `/devices` | `DevicesView`, `SyncSimulatorCard` | **Partially Implemented** | External Android APK not bundled; `/api/v1/sync` blocked by middleware. | Fix middleware authentication bypass for token-authenticated endpoints and formalize companion API. |
| `/import` | `ImportView`, `ParsedPreviewTable` | **Fully Implemented** | Limited to CSV and basic text PDF parsing; scanned images fail. | Enhance statement reconciliation against existing ledger entries to prevent duplicates. |
| `/settings` | `ThemePreferenceCard`, User form | **Fully Implemented** | Lacks AI preference controls and currency rate settings. | Add AI model selector, privacy redaction controls, and multi-currency management. |
| `/profile` | `ProfileView`, password actions | **Fully Implemented** | Basic avatar and email display. | Maintain stable user profile and session security controls. |

---

## 5. Critical Database & Accounting Engine Audit

### 5.1 The Double-Mutation Hazard (Trigger vs Application Service)
In `supabase/migrations/20261031000000_initial_schema.sql` (lines 552–588), the database defines:
```sql
CREATE TRIGGER trg_sync_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_account_balance();
```
This trigger inspects `OLD.transaction_type` and `NEW.transaction_type` for `'income'`, `'expense'`, and `'transfer'`, mutating `accounts.current_balance`.

Simultaneously, `lib/services/financial-transaction-service.ts` (lines 678–740 and 1318–1336):
- On `createFinancialTransaction`: Reads `sourceAccount.current_balance`, calculates `newBal`, and issues an explicit `UPDATE accounts SET current_balance = ...`.
- On `deleteFinancialTransaction`: Iterates over `ledger_entries`, reverses the balance in `accounts`, and then deletes the transaction record.
- **Consequence:** When `deleteFinancialTransaction` deletes a transaction of type `'income'`, the application service subtracts the amount, and then the database trigger `trg_sync_account_balance` fires on delete and **subtracts the amount a second time**.
- **Remediation for V2:** Deprecate or align the database trigger to avoid double mutations, establishing the authoritative double-entry ledger (`ledger_entries`) as the sole source of truth for all account balance projections.

### 5.2 Missing Stored Procedure Migration
- The API endpoint `/api/v1/transactions/sync` (line 77) and device action `simulateSyncAction` (line 138) execute:
  `supabase.rpc("sync_android_transactions", { ... })`
- **Audit Finding:** `sync_android_transactions` does **not exist** anywhere in `supabase/migrations/*.sql`. If a developer spins up a local Supabase container or restores a staging database from repository migrations, all Android synchronization flows will throw runtime RPC errors (`42883: function public.sync_android_transactions does not exist`).
- **Remediation for V2:** Author and commit `20261107000000_android_sync_rpc.sql` capturing the complete PL/pgSQL implementation with idempotency checks and zero-trust validation.

### 5.3 Edge Middleware Route Blocking
In `lib/supabase/middleware.ts` (lines 51–66):
```typescript
const isPublicRoute =
  isAuthRoute ||
  path === "/" ||
  path.startsWith("/api/auth/callback") ||
  path.startsWith("/_next");

if (!user && !isPublicRoute) {
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
```
- **Audit Finding:** The Android synchronization endpoint `/api/v1/transactions/sync` is not in `isPublicRoute`. When the native companion app makes an HTTP `POST` request with headers `X-Device-Id` and `X-Device-Token`, it possesses no browser session cookie. The middleware intercepts the request and responds with an HTTP `307 Redirect` to `/login`, completely breaking device synchronization.
- **Remediation for V2:** Add `path.startsWith("/api/v1/")` to bypass session cookie checks and allow downstream route handlers to enforce token-based security.

### 5.4 Net Worth Formula Divergence
- In `lib/calculations/financial.ts` (`calculateNetWorth`), net worth is:
  $$\text{Net Worth} = (\text{Accounts} + \text{Investments} + \text{Assets}) - (\text{Credit Cards} + \text{Loans} + \text{Liabilities})$$
- In `supabase/migrations/20261106120000_get_dashboard_summary_rpc.sql`, the SQL function computes:
  $$\text{net\_worth} = v\_liquid - v\_credit$$
- **Consequence:** Users with ₹10,00,000 in mutual funds or ₹50,00,000 in real estate see an artificially low net worth on the dashboard overview compared to the detailed Net Worth page.
- **Remediation for V2:** Update the SQL aggregation RPC in an additive migration to sum investments, assets, loans, and liabilities.

---

## 6. Hardcoded Financial Values & Assumptions

1. **Exchange Rate Constant:**
   `lib/calculations/financial.ts` (line 17):
   `export const DEFAULT_USD_INR_RATE = 84.5;`
   Used in lines 121, 490, and 1198. This hardcodes the conversion rate for US stocks and foreign currency assets.
2. **Indian Financial Year Assumption:**
   `user_settings.financial_year_start_month` defaults to `4` (April), but several chart components assume a fixed 12-month calendar without dynamically slicing custom FY periods.
3. **Flat Loan Compounding:**
   Certain personal loan calculators assume monthly reducing balance compounding without supporting daily reducing, flat rate, or bullet repayment loans.

---

## 7. Security & Row Level Security (RLS) Audit

1. **Multi-Tenant Isolation:**
   - All 32 tables have `ROW LEVEL SECURITY` explicitly enabled and forced.
   - Policies strictly enforce `auth.uid() = user_id` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
   - Foreign key sub-tables (`budget_categories`, `bill_occurrences`) enforce parent relationship user ownership via `EXISTS (SELECT 1 ...)`.
2. **Key Security:**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design; service-role key is never exposed to client-side code.
   - Device tokens are generated with 32 bytes of cryptographic randomness (`crypto.randomBytes(32)`), prefixed with `wov_dev_`, and stored in PostgreSQL as SHA-256 hashes (`token_hash`).
3. **Zero-Trust Content Filter:**
   - `lib/security/device-auth.ts` inspects incoming payload descriptions against regex `/\b(otp|one[- ]time[- ]password|verification code|auth code|login pin)\b/i`. Any record matching OTP patterns is rejected immediately before reaching the database.

---

## 8. Performance & Scalability Baseline

1. **Next.js Production Build:**
   - 32 routes compiled.
   - Shared client bundle: **103 kB**.
   - Heaviest dynamic route: `/plan` (255 kB First Load JS due to embedded tab components).
2. **Database Query Performance:**
   - Composite indexes in `20261102000000_composite_indexes.sql` cover `(user_id, transaction_date DESC)` and `(user_id, status)`.
   - `React.cache()` memoizes authenticated user calls across server component trees.
3. **Vitest Performance Benchmark Finding:**
   - In `tests/performance-scalability.test.ts`, the assertion `expect(elapsed).toBeLessThan(50)` on 1,000 synthetic transactions occasionally spikes to ~52ms when all 28 test suites execute concurrently across CPU cores. When run isolated, it completes in `< 1ms`.
   - **Remediation for V2:** Add a warm-up cycle and raise concurrent test threshold to 100ms or isolate benchmark tests.

---

## 9. Comprehensive V1 Defect & Gap Register

| ID | Category | Severity | Description | Target Phase |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | Accounting | **P0 (Critical)** | Potential double-subtraction on transaction deletion between DB trigger `trg_sync_account_balance` and `FinancialTransactionService`. | Phase 2 |
| **DEF-02** | Ingestion | **P0 (Critical)** | Edge middleware redirects Android sync API requests to `/login` due to missing public route bypass. | Phase 6 |
| **DEF-03** | Database | **P0 (Critical)** | Stored procedure `sync_android_transactions` missing from checked-in SQL migrations. | Phase 2 / 6 |
| **DEF-04** | Financial | **P1 (High)** | Dashboard SQL aggregation RPC computes incomplete net worth ($Liquid - Credit$) rather than full balance sheet formula. | Phase 2 |
| **DEF-05** | Intelligence | **P1 (High)** | Total absence of Cloud AI assistant; only static deterministic heuristics implemented. | Phase 5 |
| **DEF-06** | Financial | **P2 (Medium)** | Hardcoded `DEFAULT_USD_INR_RATE = 84.5` lacks currency table backing and update mechanism. | Phase 3 |
| **DEF-07** | Design | **P2 (Medium)** | Theme tokens reflect "Leftovers" warm ivory/sage styling instead of Bloomberg terminal dark theme. | Phase 1 |
| **DEF-08** | Codebase | **P3 (Low)** | Orphaned Drizzle ORM dependencies (`drizzle-orm`, `drizzle-kit`, `postgres`) causing bundle and maintenance confusion. | Phase 1 |
| **DEF-09** | Navigation | **P3 (Low)** | Redundant routes (`/budgets`, `/goals`, `/recurring`) duplicate `/plan?tab=...` tabs without consolidated UX. | Phase 1 |
| **DEF-10** | Testing | **P3 (Low)** | Concurrent CPU contention causes occasional 2ms timing jitter failure in `performance-scalability.test.ts`. | Phase 7 |

---

## 10. Conclusion & Readiness for V2 Architecture

WealthOvers V1 provides an exceptional foundation: zero TypeScript errors, clean mathematical invariants, robust Supabase RLS, and a rich transaction service. However, it requires decisive architectural interventions to eliminate double-mutation risks, unblock device synchronization, unify the Bloomberg terminal aesthetic, and introduce a secure, cloud-based AI finance assistant.

Proceed to **Phase 1** once the V2 Architecture and Implementation Roadmap are approved.

