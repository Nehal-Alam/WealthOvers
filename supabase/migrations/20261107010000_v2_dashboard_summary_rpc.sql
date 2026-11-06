-- Migration: 20261107010000_v2_dashboard_summary_rpc.sql
-- Description: Harmonizes get_dashboard_summary to compute complete institutional net worth:
-- Total Assets = Liquid Accounts + Investments + Fixed Assets
-- Total Liabilities = Credit Cards + Loans + External Liabilities
-- Net Worth = Total Assets - Total Liabilities

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
    v_investments NUMERIC := 0;
    v_assets NUMERIC := 0;
    v_credit NUMERIC := 0;
    v_loans NUMERIC := 0;
    v_liabilities NUMERIC := 0;
    v_total_assets NUMERIC := 0;
    v_total_liabilities NUMERIC := 0;
    v_net_worth NUMERIC := 0;
    v_inflow NUMERIC := 0;
    v_outflow NUMERIC := 0;
BEGIN
    -- 1. Liquid Balances from non-archived accounts
    SELECT COALESCE(SUM(current_balance), 0) INTO v_liquid
    FROM public.accounts
    WHERE user_id = p_user_id AND NOT is_archived;

    -- 2. Investments Current Valuation
    SELECT COALESCE(SUM(current_valuation), 0) INTO v_investments
    FROM public.investments
    WHERE user_id = p_user_id;

    -- 3. Fixed Assets Valuation
    SELECT COALESCE(SUM(current_valuation), 0) INTO v_assets
    FROM public.assets
    WHERE user_id = p_user_id;

    -- 4. Credit Card Outstanding Balances
    SELECT COALESCE(SUM(current_outstanding), 0) INTO v_credit
    FROM public.credit_cards
    WHERE user_id = p_user_id;

    -- 5. Loan Outstanding Principal Balances
    SELECT COALESCE(SUM(outstanding_balance), 0) INTO v_loans
    FROM public.loans
    WHERE user_id = p_user_id;

    -- 6. External Personal Liabilities
    SELECT COALESCE(SUM(outstanding_amount), 0) INTO v_liabilities
    FROM public.liabilities
    WHERE user_id = p_user_id;

    -- Compute Balanced Balance Sheet Totals
    v_total_assets := v_liquid + v_investments + v_assets;
    v_total_liabilities := v_credit + v_loans + v_liabilities;
    v_net_worth := v_total_assets - v_total_liabilities;

    -- 7. Monthly Inflow using unified transaction types
    SELECT COALESCE(SUM(amount), 0) INTO v_inflow
    FROM public.transactions
    WHERE user_id = p_user_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
      AND transaction_type IN ('income', 'interest', 'refund', 'lending_collection', 'borrowing');

    -- 8. Monthly Outflow using unified transaction types
    SELECT COALESCE(SUM(amount), 0) INTO v_outflow
    FROM public.transactions
    WHERE user_id = p_user_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
      AND transaction_type IN ('expense', 'bank_charges', 'sip', 'investment_buy', 'borrowing_repayment', 'lending', 'loan_repayment', 'credit_card_repayment', 'credit_card_purchase');

    RETURN jsonb_build_object(
        'total_liquid', v_liquid::TEXT,
        'total_investments', v_investments::TEXT,
        'total_assets', v_total_assets::TEXT,
        'total_credit', v_credit::TEXT,
        'total_loans', v_loans::TEXT,
        'total_liabilities', v_total_liabilities::TEXT,
        'net_worth', v_net_worth::TEXT,
        'monthly_inflow', v_inflow::TEXT,
        'monthly_outflow', v_outflow::TEXT
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role, anon;

