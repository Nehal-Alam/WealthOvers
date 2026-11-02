-- ============================================================================
-- WealthOvers Composite Indexes & Foreign Key Optimization Migration
-- Migration: 20261102000000_composite_indexes.sql
-- ============================================================================

-- 1. Foreign Key Index on budget_categories to accelerate relational joins with budgets
CREATE INDEX IF NOT EXISTS idx_budget_categories_budget_id 
  ON public.budget_categories(budget_id);

-- 2. Foreign Key & Date Composite Index on credit_card_statements
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_card_id 
  ON public.credit_card_statements(credit_card_id, due_date DESC);

-- 3. Foreign Key & Date Composite Index on loan_payments
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id 
  ON public.loan_payments(loan_id, payment_date DESC);

-- 4. Composite Index for Ordered Fixed Assets listings
CREATE INDEX IF NOT EXISTS idx_assets_user_valuation 
  ON public.assets(user_id, current_valuation DESC);

-- 5. Composite Index for Ordered External Liabilities listings
CREATE INDEX IF NOT EXISTS idx_liabilities_user_amount 
  ON public.liabilities(user_id, outstanding_amount DESC);

-- 6. Composite Index for Financial Goals sorted by Target Date
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_target_date 
  ON public.financial_goals(user_id, target_date ASC);

-- 7. Composite Index for Alphabetical Categories lookup
CREATE INDEX IF NOT EXISTS idx_categories_user_name 
  ON public.categories(user_id, name ASC);

-- 8. Composite Index for Ordered Investment Portfolios by Valuation
CREATE INDEX IF NOT EXISTS idx_investments_user_val 
  ON public.investments(user_id, current_valuation DESC);

-- 9. Composite Index for Category-scoped Transaction Range Queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat_date 
  ON public.transactions(user_id, category_id, transaction_date DESC);
