# WEALTHOVERS V2 — PHASED IMPLEMENTATION ROADMAP

**Product:** WealthOvers V2  
**Lead Coordinator:** Main Agent (Principal Architect)  
**Execution Standard:** Strictly Sequential Quality Gates  

---

## Roadmap Overview

```mermaid
gantt
    title WealthOvers V2 Phased Implementation Schedule
    dateFormat  YYYY-MM-DD
    section Architectural Foundation
    Phase 0: V1 Audit & Architecture         :done, p0, 2026-11-06, 1d
    Phase 1: Design System & Terminal Shell  :active, p1, after p0, 2d
    section Core Financial Engines
    Phase 2: Transaction & Accounting Engine :p2, after p1, 3d
    Phase 3: Wealth & Investment Modules     :p3, after p2, 3d
    section User Modules & Intelligence
    Phase 4: Planning, Reports & Analytics   :p4, after p3, 2d
    Phase 5: Cloud AI Finance Assistant      :p5, after p4, 3d
    section Automation & Production
    Phase 6: Automation, Imports & Android   :p6, after p5, 2d
    Phase 7: Security, Performance & Release :p7, after p6, 2d
```

---

## Detailed Phase Breakdown

### PHASE 0: V1 Audit and Architecture (CURRENT PHASE)
* **Goal:** Perform an exhaustive audit of V1, establish V2 architectural specifications, map database compatibility, define agent ownership, design the Bloomberg terminal system, formulate the test strategy, and build the risk register.
* **Lead Agents:** Agent 1 (Principal Architect), Agent 4 (Database), Agent 5 (Accounting).
* **Deliverables:**
  - `docs/V2/V1_AUDIT.md`
  - `docs/V2/V2_ARCHITECTURE.md`
  - `docs/V2/DATABASE_COMPATIBILITY.md`
  - `docs/V2/AGENT_OWNERSHIP.md`
  - `docs/V2/IMPLEMENTATION_ROADMAP.md`
  - `docs/V2/DESIGN_SYSTEM.md`
  - `docs/V2/TEST_STRATEGY.md`
  - `docs/V2/RISK_REGISTER.md`
* **Acceptance Criteria:**
  - All 8 V2 specification documents authored and committed.
  - Zero modifications to production database or working code during audit.
  - Stakeholder/User review and explicit approval requested before Phase 1 begins.

---

### PHASE 1: Design System & Application Shell
* **Goal:** Transform the visual experience from the warm "Leftovers" theme to the high-density Bloomberg financial terminal interface.
* **Lead Agents:** Agent 2 (Design Specialist), Agent 3 (Frontend Specialist).
* **Key Tasks:**
  1. Update `app/globals.css` with authoritative Bloomberg CSS variables:
     - Dark Theme: `--app-bg: #101820`, `--surface: #18232D`, `--surface-elevated: #23313D`, `--border: #34424E`, `--accent: #F0A52B`, `--positive: #39B98A`, `--negative: #EF6A68`.
     - Light Theme: `--app-bg: #F3F5F7`, `--surface: #FFFFFF`, `--surface-elevated: #E8EDF1`, `--border: #D8E0E6`, `--accent: #B77A18`, `--positive: #16865D`, `--negative: #CF5353`.
  2. Implement tabular number typography (`font-variant-numeric: tabular-nums`) across all financial tables and displays.
  3. Rebuild `components/layout/app-sidebar.tsx` with collapsible terminal navigation matching Section 6 hierarchy.
  4. Build compact terminal KPI cards, ticker bar, and dense data tables in `components/ui/`.
  5. Refactor mobile bottom sheet navigation (`components/layout/mobile-nav.tsx`) with a "More" drawer.
* **Acceptance Criteria:**
  - Dark and Light Bloomberg terminal themes render with seamless switching.
  - Sidebar expands/collapses cleanly with persisted state in `stores/ui-store.ts`.
  - Zero horizontal overflow on mobile viewports (375px+).

---

### PHASE 2: Transaction and Accounting Engine
* **Goal:** Eliminate the database trigger double-mutation hazard, harmonize net worth aggregation, and ensure balanced double-entry ledger postings across all transaction types.
* **Lead Agents:** Agent 5 (Accounting Specialist), Agent 4 (Database Specialist).
* **Key Tasks:**
  1. Apply migration `20261107040000_harmonize_account_balance_triggers.sql` to safely decommission `trg_sync_account_balance` and give `FinancialTransactionService` sole authority.
  2. Apply migration `20261107010000_v2_dashboard_summary_rpc.sql` to compute complete net worth including investments, fixed assets, loans, and liabilities.
  3. Author and test unit test suites for all 16 transaction types in `FinancialTransactionService`.
  4. Ensure transaction reversal creates balanced contra-entries that exactly negate original postings.
  5. Harden idempotency checks against duplicate form submissions and concurrent API calls.
* **Acceptance Criteria:**
  - Deleting an income transaction reduces bank account balance exactly once.
  - Transfers between accounts produce zero net impact on total assets and zero cash flow change.
  - All 12 financial workflow integration tests pass with 100% precision.

---

### PHASE 3: Wealth and Investment Modules
* **Goal:** Expand the investments and liabilities engine into a consolidated portfolio management system with dynamic currency conversion and multi-asset categorization.
* **Lead Agents:** Agent 6 (Wealth Management Specialist), Agent 4 (Database Specialist).
* **Key Tasks:**
  1. Apply migration `20261107030000_currency_rates.sql` creating `public.currency_exchange_rates`.
  2. Refactor `lib/calculations/financial.ts` to query dynamic rates instead of `DEFAULT_USD_INR_RATE = 84.5`.
  3. Enhance `components/investments/investment-portfolio-view.tsx` with asset category tabs:
     - Indian Stocks (NSE/BSE)
     - US Stocks (with USD/INR historical conversion)
     - Mutual Funds & SIPs
     - ETFs & Sovereign Gold Bonds (SGB)
  4. Implement Loan Step-Up and Foreclosure Simulator in `components/loans/`.
  5. Build Credit Card Unbilled vs Billed cycle visualizer in `components/credit-cards/`.
* **Acceptance Criteria:**
  - Foreign stock holdings convert dynamically using database rates with timestamp display.
  - Loan foreclosure calculation accurately breaks down principal saved vs future interest waived.
  - Credit card statement cycle calculator accounts for leap years and custom due dates.

---

### PHASE 4: Planning, Reports and Analytics
* **Goal:** Build comprehensive personal balance sheet statements, cash flow reports, dedicated subscriptions management, and cash flow projections.
* **Lead Agents:** Agent 3 (Frontend Specialist), Agent 5 (Accounting Specialist).
* **Key Tasks:**
  1. Implement dedicated Subscriptions route `app/(dashboard)/subscriptions/page.tsx` with active cadence, renewal alarms, and cancellation tracking.
  2. Unify `app/(dashboard)/budgets/` and `/plan` components to eliminate duplicate code maintenance.
  3. Build formal Personal Balance Sheet, Income Statement (P&L), and Cash Flow Statement in `components/reports/`.
  4. Implement client-side PDF export (via printing layout) and formatted Excel (.xlsx) statement export.
  5. Add Cash Flow Scenario Simulator (e.g. income drop, major expenditure) in `components/insights/`.
* **Acceptance Criteria:**
  - Balance sheet reconciles: $\text{Assets} = \text{Liabilities} + \text{Net Worth}$.
  - Excel and CSV exports download with formatted headers and decimal precision.
  - Subscriptions view shows monthly and annual cost commitments accurately.

---

### PHASE 5: Cloud AI Finance Assistant
* **Goal:** Architect and implement a provider-independent Cloud AI gateway with read-only financial tools, PII redaction, and an interactive terminal chat interface.
* **Lead Agents:** Agent 7 (AI Architect), Agent 10 (Security Specialist).
* **Key Tasks:**
  1. Apply migration `20261107020000_ai_assistant_tables.sql` for conversation and message persistence.
  2. Build `lib/ai/gateway.ts` supporting Google Gemini, Anthropic Claude, and OpenAI with provider fallback.
  3. Implement secure, read-only financial tools in `lib/ai/tools.ts`:
     - `getSpendingBreakdown(timeRange)`
     - `getNetWorthSummary()`
     - `getUpcomingObligations()`
     - `simulateLoanPrepayment(loanId, extraAmount)`
  4. Build server-side route `/api/ai/chat/route.ts` with streaming response and authentication checks.
  5. Create Bloomberg-styled AI assistant interface in `components/ai/ai-finance-assistant.tsx`.
* **Acceptance Criteria:**
  - Assistant answers the 10 core financial questions using deterministic tool data.
  - Zero arbitrary SQL capability; prompt injection attempts are blocked.
  - Responses include explicit calculation source references and assumption disclosures.

---

### PHASE 6: Automation, Imports and Android Companion
* **Goal:** Restore native Android synchronization, eliminate edge middleware route blocking, and enhance statement ingestion.
* **Lead Agents:** Agent 10 (Deployment/Security), Agent 4 (Database), Agent 3 (Frontend).
* **Key Tasks:**
  1. Update `lib/supabase/middleware.ts` to allow `/api/v1/` routes to pass token authentication directly to route handlers.
  2. Apply migration `20261107000000_android_sync_rpc.sql` establishing `sync_android_transactions`.
  3. Verify zero-trust OTP filter rejects any SMS or notification containing sensitive authorization codes.
  4. Enhance `components/import/` to reconcile uploaded bank statements against existing ledger records.
  5. Build visual transaction review queue for flagged Android sync items.
* **Acceptance Criteria:**
  - Device API calls with `X-Device-Id` and `X-Device-Token` return HTTP 200 without redirecting to `/login`.
  - Duplicate transactions in imported statements are detected and flagged.
  - OTP messages are completely dropped with security audit events logged.

---

### PHASE 7: Security, Performance and Production Release
* **Goal:** Finalize all production release gates, execute comprehensive test suites, calibrate performance benchmarks, and prepare deployment.
* **Lead Agents:** Agent 8 (QA Specialist), Agent 9 (Performance Specialist), Agent 1 (Principal Architect).
* **Key Tasks:**
  1. Run full Vitest test suite and calibrate concurrency benchmarks in `performance-scalability.test.ts`.
  2. Audit all App Router routes with Lighthouse / Core Web Vitals to guarantee $< 120\text{ kB}$ shared bundle size.
  3. Validate CSP and enterprise security headers on Vercel deployment preview.
  4. Execute full RLS isolation test across simulated multiple users.
  5. Author `RELEASE_CHECKLIST.md` and obtain stakeholder signoff before production deployment.
* **Acceptance Criteria:**
  - 100% test pass rate across all unit, integration, and security suites.
  - Zero TypeScript errors (`tsc --noEmit`), zero ESLint errors (`next lint`).
  - Next.js production build completes cleanly.
  - Explicit user approval granted prior to production database migration or deployment.

---

Proceed to **`DESIGN_SYSTEM.md`** for the Bloomberg terminal visual specifications.

