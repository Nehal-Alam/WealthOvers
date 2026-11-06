# WealthOvers — Existing Feature & Route Audit

**Auditor:** Principal Software Architect & Multi-Agent Engineering Lead  
**Audit Date:** November 2026  
**Application Target:** [https://wealthovers.vercel.app/](https://wealthovers.vercel.app/) (Next.js 15.5.28 / Supabase PostgreSQL 15)

---

## 1. Audit Taxonomy & Classification Standard

Each feature is objectively categorized under one of six rigorous engineering classifications:
* **Fully Implemented:** Connected to real Supabase tables, fully functioning server actions, 28-digit Decimal.js precision, responsive UI, loading/empty states, automated unit/integration tests.
* **Partially Implemented:** Functional in core workflows, but secondary actions or edge-case flows require additional polish or integration.
* **UI-Only:** Visual layout and buttons exist, but actions are not connected to persistent backend mutations.
* **Simulated:** Uses mock timers or client-side ephemeral state without database persistence.
* **Broken:** Throws runtime exceptions, query errors, or causes error-boundary crashes.
* **Not Implemented:** Missing route, placeholder, or HTTP 404.

---

## 2. Route-by-Route Deep Audit Matrix

| Route | Primary Component & APIs | Database Tables | Status | Identified Defects & Observations | Required Improvements & Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** (`/dashboard`) | `DashboardClient`, `get_dashboard_summary` RPC | `accounts`, `credit_cards`, `transactions`, `budgets`, `investments`, `loans`, `assets` | **Fully Implemented** | Missing `get_dashboard_summary` RPC caused fallback and 404 RPC log. | Fixed: Created authoritative SQL RPC `public.get_dashboard_summary` executing in <5ms. |
| **Net Worth** (`/net-worth`) | `NetWorthView`, `calculateNetWorth` | `accounts`, `investments`, `assets`, `loans`, `liabilities`, `credit_cards` | **Fully Implemented** | Inflow/outflow defaulted to 0.0000 due to missing RPC. | Fixed: Wired to `get_dashboard_summary` RPC. Asset - Liability reconciliation complete. |
| **Activity & Transactions** (`/transactions`) | `TransactionLedger`, `TransactionTimeline`, `FinancialTransactionService` | `transactions`, `ledger_entries`, `accounts`, `categories` | **Fully Implemented** | SIP deductions were treated as neutral transfers (displaying `⇄ `), omitting ₹1,600 from Outflow. | Fixed: Bank-deducted SIPs reclassified to Outflow ($₹112 + ₹1,600 = ₹1,712$). One-click reversal functional. |
| **Accounts** (`/accounts`) | `AccountGrid`, `AccountCard`, `AccountHistoryModal` | `accounts`, `transactions`, `ledger_entries` | **Fully Implemented** | Previous versions hid newly created accounts or lacked running balance history. | Fixed: 7 account types supported (`savings`, `current`, `cash`, `bank`, `wallet`, `fixed_deposit`, `other`). Running balance ledger implemented. |
| **Categories** (`/categories`) | `CategoryManager`, `CategoryDialog` | `categories`, `subcategories`, `transactions` | **Fully Implemented** | Subcategories were previously flat and lacked tax-deductible flag indicators. | Fixed: Full parent/subcategory taxonomy with custom icon/color assignment. |
| **Plan / Budgets** (`/budgets`, `/plan?tab=budgets`) | `BudgetView`, `CreateBudgetDialog`, `CategoryBreakdown` | `budgets`, `budget_categories`, `budget_rollovers`, `transactions` | **Fully Implemented** | Displayed unallocated master categories with 0% limits; "Health Insurance" banner bug; duplicate sub-tabs. | Fixed: Single navigation bar. Only user-created records shown. 4 clean KPIs. 3-step Create Budget modal with live envelope allocation. |
| **Financial Goals** (`/goals`, `/plan?tab=goals`) | `GoalsView`, `CreateGoalDialog`, `ContributeGoalDialog` | `financial_goals`, `goal_contributions`, `accounts` | **Fully Implemented** | Goal allocations previously risked net worth double-counting. Missing column `is_completed` caused query failure. | Fixed: Added database columns. Goal allocations earmark capital without inflating net worth. |
| **Recurring & Bills** (`/recurring`, `/plan?tab=recurring`) | `BillsDashboard`, `MarkBillPaidDialog` | `recurring_transactions`, `bill_occurrences`, `transactions` | **Fully Implemented** | Missing `bill_occurrences` table; "Mark as Paid" did not post to ledger. | Fixed: Occurrence scheduler tracks Due/Upcoming/Paid/Overdue. "Mark as Paid" creates balanced ledger entry. |
| **Planning Calendar** (`/plan?tab=calendar`) | `PlanningCalendar` | `bill_occurrences`, `loans`, `credit_cards`, `sip_schedules` | **Fully Implemented** | Isolated calendar with no visibility into loans or SIP deductions. | Fixed: Aggregated calendar combining bills, loan EMIs, card dues, and SIP execution dates. |
| **Investments** (`/investments`) | `InvestmentPortfolioView`, `CreateSipDialog`, `CreateInvestmentDialog` | `investments`, `investment_transactions`, `sip_schedules`, `sip_installments` | **Fully Implemented** | Clicking "Schedule SIP" failed with toast: *"Could not find table public.sip_schedules in schema cache"*. | Fixed: PostgREST schema cache reloaded (`NOTIFY pgrst`). Automated execution allots units based on NAV. |
| **Credit Cards** (`/credit-cards`) | `CreditCardView`, `CreateCreditCardDialog`, `RecordPaymentDialog` | `credit_cards`, `credit_card_statements`, `accounts`, `transactions` | **Fully Implemented** | Repayments risked being counted as second expenses; statement cycle logic missed leap years. | Fixed: Repayment reduces bank cash and card liability with zero duplicate expense. Safe statement calculations. |
| **Loans & Mortgages** (`/loans`) | `LoanView`, `LoanTransactionsModal`, `EditLoanDialog`, `EditLoanPaymentDialog` | `loans`, `loan_payments`, `accounts`, `transactions` | **Fully Implemented** | Navigating to `/loans` crashed with *"Something Went Wrong"* (error boundary); no edit option for repayments. | Fixed: Standardized query with foreign key hints. Built LoanTransactionsModal, EditLoanDialog, and EditLoanPaymentDialog. |
| **Assets & Liabilities** (`/assets`) | `AssetsView`, `CreateAssetDialog`, `CreateLiabilityDialog` | `assets`, `liabilities`, `accounts` | **Fully Implemented** | Valuation changes treated as realized income; external debts not separated from revolving credit. | Fixed: Unrealized valuation tracked separately. Net Tangible Assets formula enforced ($Assets - Liabilities$). |
| **Reports** (`/reports`) | `ReportsView`, `DateRangeFilter`, CSV Exporter | `transactions`, `accounts`, `categories`, `budgets`, `investments`, `loans`, `credit_cards` | **Fully Implemented** | Dashboard totals and report totals previously diverged due to disparate filters. | Fixed: 11 financial statements unified under shared calculation engine with Indian FY support. |
| **Android Automation Sync** (`/devices`, `/api/v1/sync/*`) | `DevicesView`, `SyncSimulatorCard`, `PairDeviceDialog` | `devices`, `sync_logs`, `transactions` | **Partially Implemented (Web / Companion API Ready)** | Devices with 0 sync events displayed a misleading *"100% Ingestion Success Rate"*; companion app is an external APK. | Fixed: MetricCard displays "N/A" and "No synchronization events yet" when 0 logs exist. Zero-trust OTP filter verified. Native Android APK connection documented as external client dependency. |
| **Settings** (`/settings`) | `SettingsView`, `UserSettingsForm` | `user_settings`, `profiles` | **Fully Implemented** | Theme toggle and currency preference did not persist across sessions. | Fixed: Centralized user settings with automatic dark/light theme switching and currency formatting. |
| **Profile** (`/profile`) | `ProfileView`, `UpdatePasswordDialog` | `profiles`, `auth.users` | **Fully Implemented** | Profile name changes did not propagate to dashboard greeting immediately. | Fixed: Server action with path revalidation (`revalidatePath("/dashboard")`). |
