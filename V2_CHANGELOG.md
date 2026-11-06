# WEALTHOVERS V2 — OFFICIAL CHANGELOG

All notable changes to the WealthOvers platform are documented in this file.

---

## [2.0.0] - November 2026

### Added
- **Bloomberg-Inspired Financial Terminal Design System:**
  - CSS variables for Dark Theme (`--app-bg: #101820`, `--surface: #18232D`, `--accent: #F0A52B`, `--positive: #39B98A`, `--negative: #EF6A68`, `--info: #62A6E8`) and Light Theme (`--app-bg: #F3F5F7`, `--surface: #FFFFFF`, etc.).
  - Tabular financial font family configuration with monospace alignment for currency and telemetry figures.
  - Collapsible terminal command sidebar with 10 command groups, active indicators, and keyboard shortcut helpers.
- **Provider-Independent Cloud AI Gateway & AI Finance Assistant:**
  - `lib/ai/gateway.ts`: Multi-provider LLM router supporting Google Gemini (`gemini-1.5-flash`), Anthropic Claude (`claude-3-5-sonnet`), OpenAI (`gpt-4o`), and deterministic local rule engine fallback.
  - `lib/ai/sanitizer.ts`: Pre-dispatch PII redaction (Indian PAN, 12-digit Aadhaar, phone numbers, email addresses, and bank accounts masked to last 4 digits).
  - `lib/ai/tools.ts`: Predefined, strictly read-only financial tools (`getSpendingBreakdown`, `getNetWorthSummary`, `getPortfolioBreakdown`, `simulateLoanPrepayment`, `forecastCashFlow`). Zero arbitrary SQL execution.
  - `app/api/ai/chat/route.ts`: Session-authenticated AI chat endpoint with real-time financial context augmentation.
  - `components/ai/ai-finance-assistant.tsx`: Bloomberg-styled terminal interface with quick-action telemetry chips, source verification badges, and markdown table rendering.
  - `app/(dashboard)/ai-assistant/page.tsx`: Dedicated terminal route for AI financial advisory.
  - `supabase/migrations/20261107040000_ai_assistant_tables.sql`: Dedicated conversation and message persistence tables with strict RLS (`auth.uid() = user_id`).
- **Dedicated Subscriptions Tracker Module:**
  - `app/(dashboard)/subscriptions/page.tsx` & `components/subscriptions/`: Real-time subscription manager connected to `public.subscriptions`.
  - Telemetry KPI cards for monthly normalized outflow, annual commitment, active service count, and upcoming renewal countdowns.
  - Server actions for adding, pausing, activating, and canceling subscriptions.
- **Android Companion Sync Automation & Stored Procedure:**
  - `supabase/migrations/20261107000000_android_sync_rpc.sql`: Implemented missing `sync_android_transactions` stored procedure.
  - `lib/supabase/middleware.ts`: Whitelisted `/api/v1/*` routes to allow token-authenticated companion devices to reach `/api/v1/transactions/sync` without 307 redirect.
- **Additive Database Migrations:**
  - `supabase/migrations/20261107010000_v2_dashboard_summary_rpc.sql`: Harmonized net worth formula in database RPC.
  - `supabase/migrations/20261107020000_harmonize_account_balance_triggers.sql`: Decommissioned redundant trigger `trg_sync_account_balance` to prevent double-subtraction.
  - `supabase/migrations/20261107030000_currency_rates.sql`: Created `public.currency_exchange_rates` table for multi-currency portfolio conversion.

### Fixed
- **DEF-01 (P0):** Double-subtraction defect on transaction deletion eliminated by removing the conflicting database trigger and vesting single-authority mutation in `FinancialTransactionService`.
- **DEF-02 (P0):** Edge middleware redirection of `/api/v1/*` unblocked for Android companion sync.
- **DEF-03 (P0):** Missing `sync_android_transactions` RPC restored in versioned migration.
- **DEF-04 (P1):** Net worth formula in `get_dashboard_summary` RPC unified to include investments, tangible assets, and external debts.
- **DEF-05 (P1):** Incomplete AI integration resolved through multi-provider gateway and dedicated terminal UI.

### Changed
- Expanded Vitest test suite from 28 to 31 test suites, achieving 263 passed tests (0 failures).
- Next.js production build verified across 34 App Router routes with shared bundle size of 103 kB.
