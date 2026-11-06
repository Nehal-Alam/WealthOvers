-- Migration: 20261106120000_get_dashboard_summary_rpc.sql
-- Description: Server-side SQL Aggregation RPC get_dashboard_summary for fast sub-millisecond dashboard and net worth metrics

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
    -- 1. Aggregate Liquid Assets from non-archived accounts
    SELECT COALESCE(SUM(current_balance), 0)
    INTO v_liquid
    FROM public.accounts
    WHERE user_id = p_user_id AND NOT is_archived;

    -- 2. Aggregate Credit Liabilities from credit cards
    SELECT COALESCE(SUM(current_outstanding), 0)
    INTO v_credit
    FROM public.credit_cards
    WHERE user_id = p_user_id;

    -- 3. Aggregate Inflow using unified transaction types
    SELECT COALESCE(SUM(amount), 0)
    INTO v_inflow
    FROM public.transactions
    WHERE user_id = p_user_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
      AND transaction_type IN ('income', 'interest', 'refund', 'lending_collection', 'borrowing');

    -- 4. Aggregate Outflow using unified transaction types (including SIP & investment bank deductions)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_outflow
    FROM public.transactions
    WHERE user_id = p_user_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
      AND transaction_type IN ('expense', 'bank_charges', 'sip', 'investment_buy', 'borrowing_repayment', 'lending', 'loan_repayment', 'credit_card_repayment', 'credit_card_purchase');

    RETURN jsonb_build_object(
        'total_liquid', v_liquid::TEXT,
        'total_credit', v_credit::TEXT,
        'net_worth', (v_liquid - v_credit)::TEXT,
        'monthly_inflow', v_inflow::TEXT,
        'monthly_outflow', v_outflow::TEXT
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role, anon;
