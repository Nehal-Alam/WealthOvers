# WealthOvers — Comprehensive Product & Fintech Domain Audit

**Document Version**: 1.0.0  
**Author**: Principal Software Architect & Senior Fintech Product Designer  
**Date**: November 2026  
**Application**: WealthOvers — Advanced Personal Money Manager & Net-Worth Engine  
**Production URL**: https://wealthovers.vercel.app/dashboard  
**Stack**: Next.js 15 (App Router), React 19, Supabase PostgreSQL 15, Tailwind CSS, Lucide Icons, Decimal.js, Zustand

---

## 1. Product Vision & Benchmark Positioning

WealthOvers is positioned as a **privacy-first, ultra-precise, real-time personal wealth management SaaS platform**, serving users who manage complex financial portfolios across bank accounts, credit cards, investments, real estate assets, and long-term liabilities.

### Fintech Industry Benchmark Comparison

| Dimension | WealthOvers (Current) | Copilot Money | Monarch Money | Lunch Money | Target WealthOvers V2 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Monetary Math** | **28-digit Decimal.js (Flawless)** | Float / IEEE 754 | Float / IEEE 754 | Decimal / Integer cents | **28-digit Decimal.js** |
| **Net Worth Formula** | Split between Dashboard & Net Worth | Real-time aggregate | Real-time aggregate | Real-time aggregate | **Unified Real-Time Balance Sheet** |
| **Sync Automation** | Android SMS / App Notification Sync | Plaid / MX Aggregation | Plaid / MX / Finicity | Plaid / CSV / API | **Android Zero-Trust Sync + Direct CSV/PDF** |
| **Privacy Mode** | Instant toggle masking values | Partial (Blur toggle) | None native | Custom CSS blur | **Instant Masking + Keyboard Shortcut** |
| **Command Palette** | None | Mac Cmd+K | Cmd+K | None | **Universal Cmd+K Action & Search Bar** |
| **Quick Transaction** | On page only | Global FAB & widget | Quick modal | Floating button | **Global Header CTA + Mobile Action FAB** |
| **Offline / PWA** | Web-only | Native iOS / Mac | Native iOS / Android | PWA web | **Responsive PWA with Optimistic UI** |
| **Audit Logs / Integrity** | Stored RPC & RLS | Server logs | Change history | Full audit trail | **Cryptographic deduplication + RLS** |

---

## 2. In-Depth Audit of the 14 Core Modules

WealthOvers comprises 14 functional modules within `app/(dashboard)`. The following section audits each module's current state, business logic completeness, edge-case resilience, and gaps.

### 2.1 Dashboard (`/dashboard`)
- **Current State**: Provides a high-level overview with 4 metric cards (Net Liquid Position, Liquid Capital, Total Liabilities, This Month's Savings), an active budget progress bar, recent accounts preview (up to 4), recent transactions feed (up to 5), and upcoming recurring bills (up to 3).
- **Core Strengths**: Clean dark theme, fast rendering, zero-data fallbacks with direct creation dialog triggers.
- **Product Gaps**:
  1. *Fragmented Net Worth*: Currently shows "Net Liquid Position" (`liquid_accounts - credit_accounts`), failing to include user investments (stocks, mutual funds, crypto) and physical assets (real estate, vehicles, gold) minus non-account liabilities (mortgages, personal loans). True Net Worth requires complete balance sheet aggregation.
  2. *Missing Key Fintech Metrics*: Lacks explicit standalone cards for **Monthly Inflow (Income)** and **Monthly Outflow (Expenses)**.
  3. *Static Layout*: No ability for users to customize or reorder widgets (e.g., placing Investments or Goals above Recent Transactions).
  4. *Lack of Visual Cash Flow Chart*: No embedded 30-day cash flow or net-worth trajectory chart directly on the primary dashboard.

### 2.2 Net Worth & Balance Sheet (`/net-worth`)
- **Current State**: Evaluates total assets (liquid accounts + investments + physical assets) vs total liabilities (credit cards + loans + manual liabilities) using `calculateNetWorth()`. Features dynamic Recharts allocation breakdowns.
- **Core Strengths**: Correct mathematical formulation using Decimal.js; comprehensive asset-type support.
- **Product Gaps**:
  1. Historical net-worth snapshot trend is currently simulated or static; lacks automated periodic snapshotting in PostgreSQL.
  2. Asset allocation visualization loads Recharts dynamically, but could offer deeper category breakdowns (Equity vs Debt vs Real Estate vs Cash).

### 2.3 Transactions Ledger (`/transactions`)
- **Current State**: Paginated ledger supporting transaction types (`income`, `expense`, `transfer`, `refund`). Includes search by description, type filtering, category filtering, and date ordering.
- **Core Strengths**: Strict foreign-key validation to accounts; `transfer` type enforces atomic balance adjustment on both source and destination accounts.
- **Product Gaps**:
  1. Split transactions (allocating a single receipt across multiple categories) are not yet supported.
  2. Bulk actions (bulk category reassignment, bulk delete) are missing from the table interface.
  3. Transaction tag filtering exists in DB schema (`tags text[]`), but lacks an active tag chip filter UI.

### 2.4 Accounts & Banking (`/accounts`)
- **Current State**: Grid of accounts categorised into Checking, Savings, Credit Cards, Cash, and Investment accounts with masked account numbers and institutional branding colors.
- **Core Strengths**: Built-in transfer dialog; account archiving prevents orphan transaction references.
- **Product Gaps**:
  1. Manual balance reconciliation feature ("Reconcile with Statement") is missing.
  2. No visual indicator for accounts that haven't had transactions in >60 days (dormant accounts).

### 2.5 Categories & Automated Categorization Rules (`/categories`)
- **Current State**: Nested category and subcategory hierarchy with custom colors and Lucide icons. Includes a rule matcher engine (`lib/parsers/rule-matcher.ts`) that matches merchant descriptions to categories.
- **Core Strengths**: Strong regex and substring pattern matching engine for incoming Android sync and statement imports.
- **Product Gaps**:
  1. No preview or test runner inside the "Create Rule" modal to verify pattern matching against existing transactions before saving.
  2. Lacks category budgeting shortcuts directly from the category list.

### 2.6 Budgets & Spend Management (`/budgets`)
- **Current State**: Configurable monthly/custom interval budgets with real-time spend tracking and percentage utilization.
- **Core Strengths**: Exact Decimal.js threshold calculation; visual amber/red threshold warnings.
- **Product Gaps**:
  1. Category-specific budgets (e.g., ₹15,000 for Dining, ₹8,000 for Groceries) need higher prominence alongside total envelope budgets.
  2. Rollover budgeting (carrying unspent surplus to next month) is not yet supported.

### 2.7 Recurring Bills & Subscriptions (`/recurring` & `/subscriptions`)
- **Current State**: Tracks recurring bills with interval frequencies (`daily`, `weekly`, `monthly`, `quarterly`, `yearly`) and calculates next due dates via `calculateNextOccurrence()`.
- **Core Strengths**: Automated recurring transaction detection engine (`recurring-detector.ts`) scans transaction history for cadence patterns.
- **Product Gaps**:
  1. Direct calendar export (iCal / Webcal) or ICS file generation for upcoming bill reminders.
  2. In-app notification / alert badge on the sidebar when a bill is due within 48 hours.

### 2.8 Financial Goals (`/goals`)
- **Current State**: Visual savings target trackers with target dates, target amounts, current saved amounts, and direct contribution dialogs.
- **Core Strengths**: Seamless link to funding accounts when logging a contribution.
- **Product Gaps**:
  1. Projected completion date calculator based on recent average monthly savings velocity.
  2. Milestone celebration micro-animations upon reaching 100% of a target.

### 2.9 Investments & Holdings (`/investments`)
- **Current State**: Portfolio tracker for Stocks, Mutual Funds, ETFs, and Crypto. Calculates invested amount, current market valuation, unrealized P&L, and absolute return %.
- **Core Strengths**: Manual price update dialog + CSV holdings import dialog.
- **Product Gaps**:
  1. Real-time market feed integration or manual batch price refresh.
  2. Dividend / distribution tracking.

### 2.10 Credit Cards & Statement Cycles (`/credit-cards`)
- **Current State**: Dedicated management for revolving credit cards, tracking credit limits, current outstanding balance, available credit, statement closing dates, and payment due dates.
- **Core Strengths**: Credit utilization calculation (critical for CIBIL/credit score optimization); statement recording dialog.
- **Product Gaps**:
  1. Visual credit utilization meter with safety warning when utilization exceeds 30%.
  2. Minimum due vs full balance payment workflows.

### 2.11 Loans, Mortgages & Amortization (`/loans`)
- **Current State**: Tracks principal amount, interest rate, tenure, EMI, and remaining balance. Generates full monthly amortization schedules via `generateAmortizationSchedule()`.
- **Core Strengths**: Exceptional mathematical precision for reducing-balance interest calculations.
- **Product Gaps**:
  1. Prepayment / foreclosure simulation (showing interest saved if an extra ₹10,000/month is paid).
  2. Export amortization table to CSV.

### 2.12 Financial Reports & Analytics (`/reports`)
- **Current State**: Inflow vs outflow cash flow trends and category-wise expense distribution charts using Recharts.
- **Core Strengths**: Dynamic loading prevents bundle bloat; supports custom date range selectors.
- **Product Gaps**:
  1. Month-over-month percentage change comparison cards (e.g. "Dining out +14% vs last month").
  2. One-click PDF / CSV export of financial statements.

### 2.13 Bank Statement Import (`/import`)
- **Current State**: Multi-format statement importer supporting CSV, Excel (.xlsx/.xls), and PDF. Includes automatic duplicate detection via SHA-256 hash matching and staging preview.
- **Core Strengths**: 500-item atomic batch chunking prevents serverless timeout on massive statements; parser auto-detects date and currency columns.
- **Product Gaps**:
  1. Column mapping memory (remembering column mappings for specific banks like HDFC, ICICI, SBI).
  2. Inline editing of parsed rows directly in the preview table before final import.

### 2.14 Android Companion Sync (`/devices`)
- **Current State**: Companion pairing system allowing Android devices running the WealthOvers sync agent to push SMS and app transaction notifications securely via HMAC-SHA256 authentication and device tokens.
- **Core Strengths**: Zero-Trust security rules strictly blacklist OTPs, passwords, and sensitive banking messages; automated categorization rule integration.
- **Product Gaps**:
  1. QR-code based instant pairing in `PairDeviceDialog`.
  2. Live sync status heartbeat indicator.

---

## 3. Financial Integrity & Calculation Engine Audit

WealthOvers relies on `lib/calculations/financial.ts` for all balance adjustments, returns, amortization, and budget metrics.

### Mathematical Correctness Verification
- **Precision**: Configured to `Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })`. This completely eliminates IEEE 754 floating-point inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`).
- **Currency Handling**: Default currency is INR (₹) with dynamic conversion support for USD ($) via `convertCurrency()`. All amounts in PostgreSQL are stored as `numeric(15, 4)` to guarantee exact precision.
- **Account Balance Trigger**: Database triggers on `transactions` automatically adjust `accounts.current_balance` within the same ACID transaction, guaranteeing that ledger balances and account totals never drift.

---

## 4. Priority Product Recommendations for Phase 2–4

1. **Unified Dashboard Financial Hierarchy**:
   - Upgrade Dashboard top cards to display the full 7-metric fintech hierarchy:
     1. **Total Net Worth** (Complete Balance Sheet: Liquid + Investments + Assets - Liabilities - Loans)
     2. **Total Assets**
     3. **Total Liabilities**
     4. **Liquid Capital**
     5. **Monthly Income**
     6. **Monthly Expenses**
     7. **Savings Rate (%)**
2. **Command Palette (`Cmd+K`)**:
   - Add a global command palette in the header for keyboard navigation across all 14 routes, instant transaction creation, and quick search.
3. **Global Quick Add Transaction CTA & Mobile FAB**:
   - Provide persistent 1-click transaction creation from any screen on desktop and mobile.
4. **Widget Customization & Independent Lazy-Loading**:
   - Allow users to toggle or rearrange secondary dashboard modules with preferences stored in local storage.

