-- ============================================================================
-- WealthOvers Performance & Index Optimization Migration
-- Migration: 20261101000000_performance_optimizations.sql
-- ============================================================================

-- 1. Composite Index for high-frequency transaction type and date queries (Dashboard, Cash Flow, Budgets)
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
  ON public.transactions(user_id, transaction_type, transaction_date DESC);

-- 2. Composite Index for inter-account transfer lookups on destination account
CREATE INDEX IF NOT EXISTS idx_transactions_user_dest_account 
  ON public.transactions(user_id, destination_account_id, transaction_date DESC)
  WHERE destination_account_id IS NOT NULL;

-- 3. Composite Index for upcoming recurring transactions & bills
CREATE INDEX IF NOT EXISTS idx_recurring_user_active_date 
  ON public.recurring_transactions(user_id, is_active, next_occurrence_date)
  WHERE is_active = TRUE;

-- 4. Foreign key index on subcategories
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id 
  ON public.subcategories(category_id);

-- 5. Composite index for user import jobs filtering by status
CREATE INDEX IF NOT EXISTS idx_import_jobs_user_status 
  ON public.import_jobs(user_id, status);

-- 6. Server-side SQL Aggregation RPC: get_dashboard_summary
-- Collapses multiple round trips and transaction table scans into a single atomic query
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_liquid NUMERIC := 0;
    v_credit NUMERIC := 0;
    v_inflow NUMERIC := 0;
    v_outflow NUMERIC := 0;
BEGIN
    -- 1. Aggregate Liquid Assets & Credit Liabilities from accounts
    SELECT 
        COALESCE(SUM(CASE WHEN account_type NOT IN ('credit_card', 'loan_account') THEN current_balance ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN account_type IN ('credit_card', 'loan_account') THEN current_balance ELSE 0 END), 0)
    INTO v_liquid, v_credit
    FROM public.accounts
    WHERE user_id = p_user_id AND NOT is_archived;

    -- 2. Aggregate Inflow and Outflow using indexed date range
    SELECT
        COALESCE(SUM(CASE WHEN transaction_type IN ('income', 'refund') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_inflow, v_outflow
    FROM public.transactions
    WHERE user_id = p_user_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date;

    RETURN jsonb_build_object(
        'total_liquid', v_liquid::TEXT,
        'total_credit', v_credit::TEXT,
        'net_worth', (v_liquid - v_credit)::TEXT,
        'monthly_inflow', v_inflow::TEXT,
        'monthly_outflow', v_outflow::TEXT
    );
END;
$$;

