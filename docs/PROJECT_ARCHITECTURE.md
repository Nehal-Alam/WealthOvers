# WealthOvers — Project Architecture & System Design

**Version:** 2.0.0  
**Architect:** Principal Software Architect (Agent A)  
**Target Environment:** Next.js 15.5.28 App Router, Supabase PostgreSQL 15, React 19, TypeScript 5, Decimal.js (28-digit precision)  
**Status:** Production Standard Architecture

---

## 1. High-Level Architectural Vision

WealthOvers is a high-integrity personal financial management platform designed under strict fintech and accounting standards. Unlike conventional personal finance trackers that operate as loosely coupled CRUD apps, WealthOvers implements a **Unified Financial Transaction Ledger** underpinned by double-entry bookkeeping rules.

```
                              ┌──────────────────────────────────┐
                              │     User Interaction Layer       │
                              │   (Next.js 15 App Router / SSR)  │
                              └─────────────────┬────────────────┘
                                                │
                                                ▼
                              ┌──────────────────────────────────┐
                              │   Financial Presentation & UI    │
                              │  Leftovers Design System Tokens  │
                              └─────────────────┬────────────────┘
                                                │
                                                ▼
                              ┌──────────────────────────────────┐
                              │    Financial Service Engine      │
                              │ (FinancialTransactionService.ts) │
                              │   Double-Entry Ledger Balancing  │
                              │      Decimal.js High Precision   │
                              └─────────────────┬────────────────┘
                                                │
                                                ▼
                              ┌──────────────────────────────────┐
                              │  Supabase PostgreSQL 15 Engine   │
                              │   Row-Level Security (Multi-Ten) │
                              │   Audit Logs & Entity Relations  │
                              └──────────────────────────────────┘
```

---

## 2. Technology Stack & Technical Specifications

| Layer | Technology | Version | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js App Router | 15.5.28 | Server-side rendering, streaming SSR, Server Actions, Route Handlers |
| **Language** | TypeScript | 5.x | Strict type safety, shared database type generation (`types/database.ts`) |
| **Frontend UI** | React | 19.x | React Server Components (RSC) + Client Components (`"use client"`) |
| **Styling** | Tailwind CSS | 3.4.x | Design tokens, custom color palette (`#F7F7F0` neutral, `#244B3C` primary) |
| **Database** | Supabase PostgreSQL | 15.x | Relational storage, UUID primary keys, check constraints, RLS policies |
| **Auth** | Supabase SSR Auth | 0.5.x | Cookie-based session storage, middleware token refresh, user isolation |
| **Math Engine** | Decimal.js | 10.x | 28-digit precision floating-point arithmetic (prevents IEEE 754 rounding bugs) |
| **Testing** | Vitest | 2.1.9 | Fast ESM-native unit and integration testing |

---

## 3. Core Functional Modules

WealthOvers delivers 17 cohesive financial planning and tracking modules:

1. **Home Dashboard (`/dashboard`)**: Central executive summary showing Net Worth, Liquid Cash, Monthly Budget Burn, Upcoming Bills, and Recent Transactions.
2. **Net Worth Tracker (`/net-worth`)**: Real-time asset-liability balance sheet ($Assets - Liabilities = Net Worth$).
3. **Activity & Transactions (`/transactions`)**: Centralized multi-account transaction ledger with timeline/table views, advanced filters, and one-click reversal.
4. **Accounts (`/accounts`)**: Multi-institution account manager supporting Savings, Current, Cash, Bank, Wallet, Fixed Deposit, and Other accounts with running balance ledgers.
5. **Categories & Tax Envelopes (`/categories`)**: Hierarchical transaction classification engine with parent categories and customizable subcategories.
6. **Budgets & Limits (`/budgets`, `/plan?tab=budgets`)**: Monthly, weekly, and custom-period budget envelopes with rollover allowances and safe velocity calculations.
7. **Financial Goals (`/goals`, `/plan?tab=goals`)**: Milestone-driven capital accumulation planner with shortfall calculation and non-inflating earmarking.
8. **Recurring Bills (`/recurring`, `/plan?tab=recurring`)**: Recurring transaction schedule manager with individual `bill_occurrences` and double-entry payment flows.
9. **Planning Calendar (`/plan?tab=calendar`)**: Integrated month/week timeline consolidating bill dues, loan EMIs, card dues, and SIP deductions.
10. **Planning Analytics (`/plan?tab=analytics`)**: Budget vs. actual spending variance, historical trends, and category distribution.
11. **Investment Portfolio (`/investments`)**: Real-time holding tracker for Stocks, Mutual Funds, ETFs, Crypto, and Gold with automated NAV tracking.
12. **SIP Management (`/investments` SIP Modal)**: Systematic Investment Plan scheduler with automated execution and unit allotment.
13. **Credit Cards (`/credit-cards`)**: Revolving credit balance, statement cycle, available limit, and grace period tracker.
14. **Loans & Debt (`/loans`)**: Amortization scheduler for mortgages, personal loans, vehicle loans, and peer lending (`loan_given` vs `loan_received`).
15. **Assets & Liabilities (`/assets`)**: Physical asset tracking (Real estate, vehicles, valuables) and manual liabilities.
16. **Reports & Tax Exports (`/reports`)**: Income statements, cash-flow reports, and CSV exports.
17. **Financial Insights (`/insights`)**: Rule-based spending anomaly detection, recurring expense audits, and savings rate analysis.

---

## 4. Multi-Agent Development Lifecycle & Boundaries

```
[Agent A: Technical Architect]
       │
       ├─► [Agent B: Database Engineer] ──► Migrations, Schemas, RLS, DB Indexes
       │
       ├─► [Agent C: Financial Engineer] ──► Double-Entry Ledger, Financial Math, Actions
       │
       ├─► [Agent D: Frontend Engineer] ──► UI Components, Leftovers Tokens, Dialogs
       │
       ├─► [Agent E: QA Engineer] ────────► Vitest Suites, Regression Checks, E2E
       │
       └─► [Agent F: Performance & Sec] ──► Latency Audit, Next.js Build, Bundle Tree-Shaking
```

### Shared Resource Locking Rules:
- **No Direct Schema Alterations:** Agent B authors migrations in `supabase/migrations/`; Agent A reviews before execution.
- **Unified Transaction Invariant:** All financial mutations must call `FinancialTransactionService.createFinancialTransaction()`. No frontend component or server action may perform standalone unrecorded balance updates.
- **No Pre-Populated Master Category Envelopes:** Predefined categories must only act as templates or reference taxonomies. They must never appear as active user budgets unless allocated by the user.
