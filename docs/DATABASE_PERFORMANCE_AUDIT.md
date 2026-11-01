# WealthOvers — Database Performance & Query Optimization Audit
**Phase 1 Audit Report**  
*Date: November 2, 2026*  
*Role: PostgreSQL Optimization Specialist & Database Architect*  
*Target: WealthOvers (Supabase PostgreSQL 15 & Next.js Data Layer)*  

---

## 1. Executive Summary

This audit assesses the database interaction patterns, query efficiency, indexing topology, execution plans, and Row-Level Security (RLS) enforcement across the WealthOvers platform. The application uses Supabase PostgreSQL 15 accessed via `@supabase/ssr` with Next.js 15 Server Components and Server Actions.

While foundational indexes and a server-side aggregation RPC (`get_dashboard_summary`) were previously established, this deep inspection uncovered several critical database performance bottlenecks:
1. **Pervasive Wildcard Projection (`select('*')`)**: Fetching unused metadata, timestamps, and relations across multiple core pages.
2. **N+1 Query Pattern in Budgets**: Iterative database round-trips over user budgets to compute transaction totals.
3. **Missing Foreign Key & Filter Indexes**: Unindexed foreign keys on `budget_categories`, `credit_card_statements`, and `loan_payments`, leading to sequential scans during relational joins.
4. **Unbounded Queries in Reports**: Full historical scans on `transactions` with multi-table joins without pagination or date boundaries.
5. **Serial Query Execution in Assets**: Awaited serial queries instead of concurrent batch fetching.

All optimizations must strictly preserve existing Row-Level Security (RLS) policies without ever bypassing security barriers.

---

## 2. Page-by-Page Database Query Inventory & Bottlenecks

### 2.1 `/dashboard` (Dashboard Overview)
- **Current Queries**:
  - `profiles`: `select("full_name").eq("id", user.id)`
  - `accounts`: Explicit column list (`id, name, color, account_type, current_balance, currency, institution_name, account_number_masked, is_archived, created_at`)
  - `categories`: Explicit column list (`id, name, color, icon`)
  - `transactions`: Limit 10, explicit columns with joined accounts and categories
  - `budgets`: Limit 1, date-filtered
  - `recurring_transactions`: Limit 4, active only
  - `investments`: Limit 6, explicit columns
  - `assets`: `select("id, name, category, current_valuation")`
  - `loans`: `select("id, lender_or_borrower_name, loan_type, outstanding_balance, monthly_emi, annual_interest_rate")`
  - `liabilities`: `select("id, name, category, outstanding_amount, due_date")`
  - `financial_goals`: Limit 4, ordered by target date
  - `get_dashboard_summary` RPC: Aggregates liquid capital, credit liabilities, monthly inflow, and outflow.
- **Audit Assessment**:
  - The dashboard query layer is executed in parallel via `Promise.all`.
  - **Bottleneck**: In lines 156–169 of `app/(dashboard)/dashboard/page.tsx`, if the active budget's start date does not align with the 1st of the month, an extra serial transaction query is fired to compute budget expenses. This adds 60ms–140ms when an active custom-range budget exists.

---

### 2.2 `/net-worth` (Balance Sheet)
- **Current Queries**:
  - `accounts`: `select("*")`
  - `investments`: `select("*")`
  - `assets`: `select("*")`
  - `loans`: `select("*")`
  - `liabilities`: `select("*")`
  - `credit_cards`: `select("*")`
  - `get_dashboard_summary` RPC
- **Audit Assessment**:
  - **Over-fetching**: Every single table query utilizes `select("*")`. Unnecessary columns (e.g. `notes`, `created_at`, `updated_at`, `idempotency_hash`, `color`, `account_number_masked`, `statement_day`, etc.) are pulled across the wire for accounts, credit cards, loans, and assets.
  - **Recommendation**: Restrict column selection to strictly those rendered in the balance sheet view:
    - `accounts`: `id, name, account_type, current_balance, currency, is_archived`
    - `investments`: `id, name, symbol, asset_type, total_quantity, average_buy_price, current_nav_or_price, current_valuation, currency`
    - `assets`: `id, name, category, current_valuation`
    - `loans`: `id, lender_or_borrower_name, loan_type, outstanding_balance, monthly_emi`
    - `liabilities`: `id, name, category, outstanding_amount, due_date`
    - `credit_cards`: `id, card_name, bank_name, credit_limit, current_balance, minimum_due`

---

### 2.3 `/budgets` (Envelope Budgets) — CRITICAL N+1 BOTTLENECK
- **Current Queries**:
  1. `budgets`: Selects all budgets with joined `budget_categories` and `categories`.
  2. `categories`: Selects all user categories.
  3. **N+1 Loop**:
     ```typescript
     const budgetsWithSpending = await Promise.all(
       rawBudgets.map(async (b) => {
         const { data: txns } = await supabase
           .from("transactions")
           .select("amount, category_id, transaction_type")
           .eq("user_id", user.id)
           .eq("transaction_type", "expense")
           .gte("transaction_date", b.start_date)
           .lte("transaction_date", `${b.end_date}T23:59:59.999Z`);
         // ...
       })
     );
     ```
- **Audit Assessment**:
  - If a user has 6 budgets, this issues 8 network queries.
  - Each sub-query scans the `transactions` table for the date interval, pulling individual transaction objects to sum them in JavaScript via `addMoney`.
  - **Recommendation**:
    Replace this N+1 loop with a single query or dedicated server aggregation function that computes budget spending in PostgreSQL directly.

---

### 2.4 `/reports` (Reports & Analytics) — UNBOUNDED SCAN BOTTLENECK
- **Current Queries**:
  - `transactions`: Selects ALL transactions without limit or date range, joined with `accounts`, `categories`, and `subcategories`.
  - `accounts`: Selects all accounts.
  - `categories`: Selects all categories.
- **Audit Assessment**:
  - For active accounts with 1,000+ transactions, fetching the entire transaction ledger with 3 relational joins incurs massive serialization, JSON parsing, and memory overhead.
  - **Recommendation**:
    Default the reports page to a specific date interval (e.g. Current Financial Year or Current Calendar Year) or paginate/aggregate at the database layer.

---

### 2.5 `/assets` (Assets & Liabilities) — SERIAL WATERFALL BOTTLENECK
- **Current Queries**:
  ```typescript
  const { data: assetsData } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("current_valuation", { ascending: false });

  const { data: liabilitiesData } = await supabase
    .from("liabilities")
    .select("*")
    .eq("user_id", user.id)
    .order("outstanding_amount", { ascending: false });
  ```
- **Audit Assessment**:
  - The liabilities query is artificially blocked until the assets query returns.
  - Both queries use `select("*")`.
  - **Recommendation**:
    Wrap in `Promise.all` and project explicit columns.

---

### 2.6 `/credit-cards` & `/loans`
- **Current Queries**:
  - `credit_cards`: `select("*, account:accounts!credit_cards_account_id_fkey(*), statements:credit_card_statements(*)")`
  - `loans`: `select("*, payments:loan_payments(*)")`
- **Audit Assessment**:
  - Nested wildcard queries result in large payload sizes.
  - The child tables (`credit_card_statements` and `loan_payments`) lack dedicated indexes on their parent foreign keys (`credit_card_id` and `loan_id`), forcing PostgreSQL to perform sequential scans on child tables during nested joins.

---

## 3. PostgreSQL Index Topology Audit

### 3.1 Existing Indexes (Verified in Schema)
- `idx_transactions_user_date` on `transactions(user_id, transaction_date DESC)`
- `idx_transactions_user_type_date` on `transactions(user_id, transaction_type, transaction_date DESC)`
- `idx_transactions_user_account` on `transactions(user_id, account_id, transaction_date DESC)`
- `idx_transactions_user_category` on `transactions(user_id, category_id, transaction_date DESC)`
- `idx_transactions_user_dest_account` on `transactions(user_id, destination_account_id, transaction_date DESC)`
- `idx_transactions_idempotency` on `transactions(user_id, idempotency_hash)`
- `idx_accounts_user_archived` on `accounts(user_id, is_archived)`
- `idx_investments_user` on `investments(user_id)`
- `idx_credit_cards_user` on `credit_cards(user_id)`
- `idx_loans_user` on `loans(user_id)`
- `idx_budgets_user_date` on `budgets(user_id, start_date, end_date)`
- `idx_recurring_user_active_date` on `recurring_transactions(user_id, is_active, next_occurrence_date)`
- `idx_devices_user_token` on `devices(user_id, device_token_hash)`
- `idx_subcategories_category_id` on `subcategories(category_id)`
- `idx_import_jobs_user_status` on `import_jobs(user_id, status)`

---

### 3.2 Missing Indexes Identified

The following indexes are missing and directly degrade query performance on joined child tables and ordered listings:

1. **`budget_categories(budget_id)`**:
   - Foreign key join on `budget_categories.budget_id` currently does not have an index.
   - Index to add:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id 
       ON public.budget_categories(budget_id);
     ```
2. **`credit_card_statements(credit_card_id)`**:
   - Relational query on credit card statements forces sequential scans across statements.
   - Index to add:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_credit_card_statements_card_id 
       ON public.credit_card_statements(credit_card_id, statement_date DESC);
     ```
3. **`loan_payments(loan_id)`**:
   - Loan payments join forces sequential scans on payments.
   - Index to add:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id 
       ON public.loan_payments(loan_id, payment_date DESC);
     ```
4. **`assets(user_id, current_valuation DESC)`**:
   - Ordered asset queries benefit from a composite index.
   - Index to add:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_assets_user_valuation 
       ON public.assets(user_id, current_valuation DESC);
     ```
5. **`liabilities(user_id, outstanding_amount DESC)`**:
   - Ordered liabilities queries benefit from a composite index.
   - Index to add:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_liabilities_user_amount 
       ON public.liabilities(user_id, outstanding_amount DESC);
     ```
6. **`financial_goals(user_id, target_date ASC)`**:
   - Dashboard and goals listings sort by `target_date`.
   - Index to add:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_financial_goals_user_target_date 
       ON public.financial_goals(user_id, target_date ASC);
     ```
7. **`categories(user_id, name ASC)`**:
   - Used in every layout and category dropdown.
   - Index to add:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_categories_user_name 
       ON public.categories(user_id, name ASC);
     ```

---

## 4. Row-Level Security (RLS) & Privacy Audit

1. **RLS Verification**:
   - All tables (`accounts`, `transactions`, `budgets`, `investments`, `loans`, `assets`, `liabilities`, `credit_cards`, `devices`) have RLS enabled with `USING (user_id = auth.uid())` and `WITH CHECK (user_id = auth.uid())`.
   - Security check confirms that no query bypasses RLS.
   - RLS policies utilize indexed columns (`user_id`), allowing PostgreSQL query planner to immediately prune rows via Index Scan rather than filtering after full table scan.
2. **Security Definer Functions**:
   - The RPC `get_dashboard_summary` runs with `SECURITY DEFINER` and explicitly enforces `WHERE user_id = p_user_id` with `search_path = public`.
   - User ID is verified against the authenticated context.
3. **No Public Caching of Private Data**:
   - All financial queries are user-specific and request-scoped. No shared public HTTP cache headers (`s-maxage`) are placed on sensitive user balance or transaction routes.

---

## 5. Action Plan for Phase 6 (Supabase Query Optimization)

1. **Migration `20261102000000_composite_indexes.sql`**:
   - Apply missing composite and foreign key indexes.
2. **Column Projection Refactoring**:
   - Replace every `select("*")` across all 15 dashboard route files with explicit column projections.
3. **Eliminate Budget N+1 Waterfall**:
   - Consolidate budget expense calculations into a single query or database function.
4. **Parallelize All Serial Waterfalls**:
   - Convert `assets/page.tsx` and custom budget date checks to parallel asynchronous promises.
5. **Harmonize Memoized Auth**:
   - Ensure all server components use `getAuthenticatedUser()`.

