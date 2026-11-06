# WealthOvers — Project Changelog

All notable changes to the WealthOvers platform are documented here.

## [2.1.0] — November 2026

### Added
- **Unified Double-Entry Transaction Modification Engine (`lib/services/financial-transaction-service.ts`)**:
  - `updateFinancialTransaction`: Calculates precise debit/credit deltas, reverses obsolete account balance mutations, adjusts destination balances atomically, and re-posts ledger entries.
  - `deleteFinancialTransaction`: Reverses posted ledger entries and restores account balances cleanly.
  - Multi-split transactions now construct balanced ledger entries sharing a unique `transferGroupId`.
- **Serverless PostgreSQL Connection Pooling Singleton (`lib/db/index.ts`)**:
  - Created a `globalThis` singleton for Drizzle ORM client to eliminate connection exhaustion across Next.js serverless functions.
  - Added support for `DIRECT_URL` (port 5432) for migrations and pooled `DATABASE_URL` (port 6543) for application runtime.
- **Server-Side Request Deduplication Layer (`lib/data/cached-queries.ts`)**:
  - Wrapped `profile`, `accounts`, and `categories` queries in `React.cache()` to share data across server component hierarchies without duplicate network trips.
- **On-Demand Ledger Fetching (`getLedgerEntriesAction`)**:
  - Stripped heavy recursive `ledger_entries` queries from `/transactions` initial server render, cutting payload size and deferring detailed ledger loading until a user opens the transaction details modal.
- **Serverless Upload Guardrails (`app/(dashboard)/import/actions.ts` & `upload-statement-card.tsx`)**:
  - Enforced a 4.5 MB hard limit on statement uploads (both client-side preflight and server-side validation) to protect against unhandled Vercel 413 HTTP payload drops.
- **Automated Continuous Integration Workflow (`.github/workflows/ci.yml`)**:
  - Standardized GitHub Actions pipeline running Node.js 22, type checking (`tsc --noEmit`), linting (`next lint`), and full Vitest suite.
- **Root Vercel Deployment Configuration (`vercel.json`)**:
  - Set `maxDuration: 60` for financial API routes to ensure long calculations complete without timeout.
- **Master Orchestration Test Suite (`tests/phase20-master-orchestration-verification.test.ts`)**:
  - 6 new automated tests verifying transaction update delta math, split transaction ledger balancing, net worth harmonization, and 4.5 MB statement upload bounds. Total tests: 239/239 passing.

### Changed
- **Dashboard Net Worth Calculation (`components/dashboard/dashboard-client.tsx`)**:
  - Replaced ad-hoc balance sheet computation with authoritative `calculateNetWorth` domain logic. Correctly handles `loan_given` as an asset receivable and deducts credit card liabilities.
- **Plan Module Waterfall Query Parallelization (`app/(dashboard)/plan/page.tsx`)**:
  - Parallelized 6-month historical expense queries inside `Promise.all`, cutting time-to-first-byte (TTFB).
- **Transaction Table Rendering (`components/transactions/transaction-ledger.tsx`)**:
  - Memoized selection callbacks (`useCallback`) and decoupled dialog mounting to prevent eager DOM overhead.

### Fixed
- **Devices Page Column Reference (`app/(dashboard)/devices/page.tsx`)**:
  - Corrected column reference from non-existent `account_name` to `name`.
- **Account History Modal Hook Dependencies (`components/accounts/account-history-modal.tsx`)**:
  - Fixed missing reactive dependencies `account` and `transactions` in `useMemo` hooks.

## [2.0.0] — November 2026

### Added
- **12 End-to-End Financial Workflow Tests (`tests/e2e-financial-workflows.test.ts`)**: Automated coverage for Income, Expense, Transfer, Card Purchase/Payment, Loan Disbursement/Repayment/EMI, Asset Purchase/Valuation, Refund, Duplicate Protection (Idempotency), and Reversal.
- **Server-Side SQL Aggregation RPC (`public.get_dashboard_summary`)**: Sub-millisecond database procedure aggregating liquid assets, credit liabilities, monthly inflow, and monthly outflow.
- **Inflow & Outflow History Modal for Loans (`components/loans/loan-transactions-modal.tsx`)**: Visualizes initial principal disbursed vs. cumulative repayments.
- **Edit Loan Terms & Repayments**: Added `EditLoanDialog` and `EditLoanPaymentDialog` with atomic balance synchronization.
- **3-Step Structured Create Budget Modal (`components/budgets/create-budget-dialog.tsx`)**: Replaces unstructured input with guided Details, Category Allocation (with live Overall/Allocated/Unallocated breakdown), and Preferences.
- **Truthful Telemetry for Android Companion (`components/devices/devices-view.tsx`)**: Fixed misleading 100% ingestion statistic by displaying "N/A" and "No synchronization events yet" when 0 sync logs exist.

### Changed
- **Activity & Transactions Outflow Accounting**: Reclassified bank-funded SIP and investment buy transactions from neutral transfers to true cash outflows, ensuring bank deductions reflect accurately in total outflow.
- **Plan Module Navigation**: Consolidated duplicate sub-tabs into a single unified navigation header: Budgets, Financial Goals, Recurring & Bills, Planning Calendar, Analytics.
- **User-Created Records Strict Filtering**: Master categories and templates no longer populate as dummy 0% budget envelopes.

### Fixed
- **Loans Error Boundary Crash (`/loans`)**: Standardized nested query joins and foreign key hints in `app/(dashboard)/loans/page.tsx`.
- **SIP Schedule Schema Cache Error (`/investments`)**: Dispatched `NOTIFY pgrst, 'reload schema'` to PostgREST to recognize `public.sip_schedules`.
- **TypeScript & ESLint Build Errors**: Resolved all type check errors across App Router routes and components.

