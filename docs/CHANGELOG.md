# WealthOvers — Project Changelog

All notable changes to the WealthOvers platform are documented here.

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
