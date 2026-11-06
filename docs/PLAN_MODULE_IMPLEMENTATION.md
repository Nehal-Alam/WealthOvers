# WealthOvers — Advanced Plan Module Redesign & Feature Implementation

**Application:** [https://wealthovers.vercel.app/](https://wealthovers.vercel.app/)  
**Authors:** Senior Fintech Product Architect, Full-Stack Developer, Financial Planning Specialist, Database Engineer  
**Target Environment:** Next.js 15.5.28 App Router, Supabase PostgreSQL 15, React 19, TypeScript 5, Decimal.js (28-digit precision)  
**Date:** November 2026  
**Status:** **Fully Implemented & Verified (All Tests & Production Build Passed)**  

---

## 1. Executive Summary & Audit Findings

The existing WealthOvers Plan section (spanning `/budgets`, `/goals`, and `/recurring`) was audited to identify why created budgets, goals, and recurring items were either failing to display, incompletely connected, or lacking essential financial planning capabilities.

### Identified Root Causes & Architectural Deficiencies:

1. **Schema Mismatches & Crashing Queries:**
   - In `app/(dashboard)/goals/page.tsx`: The select query requested `is_completed` and `notes`, but the `public.financial_goals` table lacked both columns, causing PostgREST query failure or null data.
   - In `app/(dashboard)/recurring/page.tsx`: The select query requested `description`, but `public.recurring_transactions` lacked `description`, failing to load recurring rules.
   - In `app/(dashboard)/budgets/page.tsx`: Multiple budgets could not be viewed together; only `budgets[0]` was rendered, with no multi-period navigation or category-level tracking when category allocations were not explicitly pre-seeded.

2. **Absence of Unified Planning Hub:**
   - Navigating to `/plan` resulted in HTTP 404 because "Plan" in the sidebar merely pointed to `/budgets`.
   - The three core planning facets—**Budgets & Limits**, **Financial Goals**, and **Recurring & Bills**—operated as isolated pages without unified period context, shared KPIs, planning calendar, or integrated analytics.

3. **Missing Category-Wise Budget Tracking:**
   - The user reported: *"Below the KPI cards and overall progress bar, display a comprehensive Category Budget Breakdown."*
   - When a user created an overall monthly budget (e.g., ₹50,000 limit for November 2026), category allocations were empty (`budget_categories` count was 0). The UI completely hid category spending, making it impossible to see category utilization across Food, Groceries, Shopping, Transport, Utilities, etc.

4. **Lack of Bill Occurrence Tracking & Double-Entry Ledger Link:**
   - Recurring payments were stored only as interval rules (`recurring_transactions`). No `bill_occurrences` table existed to track individual monthly bills (Due, Upcoming, Paid, Overdue, Skipped).
   - Marking a bill as paid did not provide an account selector or post an immutable, traceable transaction to the central financial ledger.

5. **Financial Goals Earmarking vs. Net Worth Confusion:**
   - Earmarking money for a goal must NOT inflate total assets or net worth. The system lacked goal priority, shortfall calculation, contribution history, and explicit linking with transactions.

---

## 2. Database Schema Enhancements & Migrations

Migration file: `supabase/migrations/20261106100000_advanced_plan_module.sql` (executed on remote Supabase `dxvfgzqtvnpjwdibuhrh`).

### A. `public.budgets`
- Added `budget_type` (`overall_monthly`, `category`, `multi_category`, `weekly`, `custom_range`, `annual`, `account_specific`).
- Added `category_id`, `account_id` for targeted budgets.
- Added `rollover_mode` (`none`, `full`, `partial`, `capped`), `rollover_limit`.
- Added `status` (`active`, `paused`, `archived`), `notes`, `alert_thresholds` (`INTEGER[]` e.g. `{50, 75, 90, 100}`).

### B. `public.budget_categories`
- Added `notes`, `alert_threshold_percent`.

### C. `public.budget_rollovers` (New Table)
- Tracks auditable rollover history across consecutive periods with RLS (`auth.uid() = user_id`).

### D. `public.financial_goals`
- Added `start_date`, `is_completed`, `status` (`active`, `paused`, `completed`, `cancelled`), `priority` (`low`, `medium`, `high`, `urgent`), `account_id`, `investment_id`, `planned_contribution_amount`, `contribution_frequency`, `notes`, `icon_or_image`.

### E. `public.goal_contributions`
- Added `transaction_id` (foreign key to `public.transactions`), `account_id`, `contribution_type` (`deposit`, `withdrawal`).

### F. `public.recurring_transactions`
- Added `description`, `notes`, `is_variable_amount`, `payment_method`, `reminder_days_before`, `is_autopay`, `status`.

### G. `public.bill_occurrences` (New Table)
- Individual bill instances with `recurring_id`, `due_date`, `amount`, `currency`, `status` (`upcoming`, `due`, `paid`, `overdue`, `skipped`, `cancelled`), `paid_date`, `paid_amount`, `account_id`, `transaction_id`, `payment_method`, `notes`, and RLS enabled.

---

## 3. Financial Calculation Formulas & Business Rules

### A. Planning Period Filtering
Supports:
- This Week
- This Month
- Next Month
- Last Month
- Last 3 Months
- This Quarter
- This Year
- Financial Year (1 April – 31 March Indian FY)
- All Time
- Custom Period (Start Date to End Date)

### B. Overview KPI Formulas
1. **Total Budget:**
   $$\text{Total Budget} = \sum \text{Active Budget Caps for Selected Period} + \text{Rollover Allowance}$$
2. **Total Spent (Eligible Expenses):**
   $$\text{Total Spent} = \sum \text{Cash Expenses} + \sum \text{Bank Expenses} + \sum \text{Credit Card Purchases} + \sum \text{Paid Bills} + \sum \text{Loan Interest} - \sum \text{Refunds}$$
   *Strictly Excluded:* Internal transfers, investment buys, SIP principal, loan principal repayments, money borrowed/lent.
3. **Remaining Budget:**
   $$\text{Remaining Budget} = \text{Total Budget} - \text{Total Spent}$$
4. **Daily Safe-to-Spend:**
   $$\text{Daily Safe-to-Spend} = \frac{\text{Remaining Budget}}{\max(1, \text{Days Remaining in Cycle})}$$
   $$\text{Adjusted Safe-to-Spend} = \frac{\text{Remaining Budget} - \text{Upcoming Unpaid Planned Expenses}}{\max(1, \text{Days Remaining in Cycle})}$$
5. **Projected Month-End Spending:**
   $$\text{Projected Spend} = \text{Total Spent to Date} + (\text{Average Daily Spend} \times \text{Days Remaining}) + \sum \text{Upcoming Fixed Bills}$$
6. **Upcoming Bills:**
   $$\text{Upcoming Bills} = \sum \text{Pending Bill Occurrences in Cycle}$$

---

## 4. Architectural Implementation Details

### A. Unified Planning Navigation Header (`components/plan/plan-header.tsx`)
- Sub-tabs for `Monthly Budgets`, `Financial Goals`, `Recurring & Bills`, `Planning Calendar`, and `Analytics & Forecast`.
- Dynamic period selector dropdown with Previous/Next period controls.
- Seamless active tab resolution between `/plan?tab=...` and direct `/budgets`, `/goals`, `/recurring` URLs.
- Highlighted under "Plan" in the main sidebar (`components/layout/app-sidebar.tsx`).

### B. Budgets & Limits Module (`components/budgets/budget-view.tsx`, `create-budget-dialog.tsx`, `category-breakdown.tsx`)
- **6 KPI Metric Cards**: Total Budget, Total Spent, Remaining Budget, Daily Safe Velocity, Projected Month-End Spend, and Upcoming Bills.
- **Overall Budget Progress Card**: High-contrast progress meter with milestone markers and threshold alert states.
- **Category Budget Breakdown Table & Grid**:
  - Dynamically synthesizes ALL active categories (even if envelopes were not pre-allocated!).
  - Displays Category, Limit, Spent, Remaining, % Used (visual progress bar with Green <75%, Amber 75-99%, Red ≥100%, Grey 0%), Status badge, and Transaction count.
  - Interactive drilldown modal (`CategoryDetailModal`) displaying all matching transactions and 1-click "Add Expense" pre-seeded with that category.
- **Advanced Create Budget Workflow**:
  - Preset templates: Personal Monthly, Student Plan, Family Household, 50/30/20 Rule, Minimalist, Custom.
  - Budget scopes: Overall Monthly, Single Category, Multi-Category, Weekly, Custom Range, Annual, Account-Specific.
  - Rollover configuration: None, Full, Partial (50%), Capped (with maximum cap).
  - Live allocation validation warning if sum of category envelopes exceeds overall budget cap.
  - Budget actions: Duplicate for Next Month, Pause/Resume, Delete.

### C. Financial Goals Planner (`components/goals/goals-view.tsx`, `create-goal-dialog.tsx`, `contribute-goal-dialog.tsx`)
- Supports priority tiers (Urgent, High, Medium, Low) and categories (Emergency Fund, Vacation, Car, House, Education, Retirement, etc.).
- Circular progress indicators with milestone trajectories.
- **Shortfall & Savings Calculator**: Live computation of required monthly savings rate to hit target on time.
- **Interactive Funds Management**:
  - Deposit and Withdrawal flows.
  - Option to link directly to funding account.
  - Enforced accounting guardrail: Goal allocations earmark capital and never inflate overall net worth.

### D. Recurring & Bills Management (`components/recurring/bills-dashboard.tsx`, `mark-bill-paid-dialog.tsx`, `actions.ts`)
- **Bills Dashboard**:
  - Summarizes Upcoming Bills, Paid This Cycle, Bills Due Today, and Active Subscriptions.
  - Occurrences list tracking `upcoming`, `due`, `paid`, `overdue`, `skipped`.
- **Interactive "Mark as Paid" Action**:
  - Dedicated modal with payment account selector, paid amount, paid date, payment method, and notes.
  - Invokes `FinancialTransactionService.createFinancialTransaction` with balanced double-entry ledger postings.
  - Advances `next_occurrence_date` and automatically generates the next upcoming occurrence.
- "Skip Occurrence" support for ad-hoc schedule adjustments.

### E. Unified Planning Calendar (`components/plan/planning-calendar.tsx`)
- Month Grid View and Upcoming Agenda View.
- Aggregates:
  - Bill occurrences & recurring schedules
  - Loan EMI payment due dates
  - Credit card statement balance dues
  - SIP execution dates
  - Goal target milestones
- Day detail drawer with quick "Mark as Paid" action.

---

## 5. Verification & Test Results

### Test Suite Execution
- **Command:** `npx vitest run`
- **Results:**
  - **Test Files:** 26 passed (100%)
  - **Tests:** 221 passed (100%)
  - **Duration:** ~7 seconds

### Static Type Safety
- **Command:** `npm run typecheck` (`tsc --noEmit`)
- **Results:** 0 errors across all TypeScript files.

### Code Quality & Linter
- **Command:** `npm run lint` (`next lint`)
- **Results:** Passed with zero lint errors.

### Production Build
- **Command:** `npm run build` (`next build`)
- **Results:** Compiled successfully with dynamic App Router routes (`/plan`, `/budgets`, `/goals`, `/recurring`).
