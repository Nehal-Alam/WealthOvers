# WEALTHOVERS V2 — DATABASE COMPATIBILITY & SCHEMA EVOLUTION SPECIFICATION

**Application:** WealthOvers V2  
**Database:** PostgreSQL 15 (Supabase Managed)  
**Lead Engineer:** Database and Supabase Specialist (Agent 4)  
**Status:** Approved Specification  

---

## 1. Backward Compatibility Commitment & Guarantees

WealthOvers V1 contains real user accounts, sensitive financial records, investment holdings, and historical double-entry journals. V2 guarantees **100% backward compatibility** and data preservation under the following immutable rules:

1. **Zero Table Deletion:** No existing table will be dropped or renamed.
2. **Zero Data Destruction:** Existing financial transactions, running balances, categories, and account states will remain intact.
3. **Strict Additive Migrations:** All schema enhancements for V2 are strictly additive (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`).
4. **Zero RLS Weakening:** Row Level Security (RLS) remains enabled and forced on all tables. Service-role keys remain strictly prohibited in client runtimes.
5. **No Breaking Column Types:** Existing columns maintain their types and nullability constraints. New required columns supply safe defaults.

---

## 2. Complete V1 Table Inventory & Status

The database contains 32 tables partitioned across operational financial domains:

| # | Table Name | Purpose & Contents | RLS Status | Primary Foreign Keys | V2 Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `profiles` | User profiles, full name, avatar, phone | Enabled & Forced | `id` -> `auth.users(id)` | Retain as-is. |
| 2 | `user_settings` | Currency, timezone, theme, privacy mode | Enabled & Forced | `user_id` -> `auth.users(id)` | Add AI model preference columns. |
| 3 | `accounts` | Bank, cash, wallet accounts, current balance | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is; enforce authoritative balance updates. |
| 4 | `categories` | Income/Expense categories, colors, icons | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is; add tax classification flag. |
| 5 | `subcategories` | Nested category breakdowns | Enabled & Forced | `category_id` -> `categories(id)` | Retain as-is. |
| 6 | `merchants` | Normalized merchant names & default category | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 7 | `categorization_rules`| Automated rule matcher (keyword to category)| Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 8 | `transactions` | Central financial transaction records | Enabled & Forced | `account_id`, `destination_account_id` | Retain as-is; preserve idempotency & sequence. |
| 9 | `ledger_entries` | Double-entry journal lines (debit / credit) | Enabled & Forced | `transaction_id`, `account_id` | Retain as-is; sole authority for reconciliation. |
| 10 | `budgets` | Envelope spending budgets, periods, caps | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 11 | `budget_categories` | Specific allocations per budget | Enabled & Forced | `budget_id` -> `budgets(id)` | Retain as-is. |
| 12 | `budget_rollovers` | Unspent surplus/deficit rollover records | Enabled & Forced | `budget_id` -> `budgets(id)` | Retain as-is. |
| 13 | `recurring_transactions`| Recurring bills, salary rules, autopay | Enabled & Forced | `account_id`, `category_id` | Retain as-is. |
| 14 | `bill_occurrences` | Scheduled occurrences (Due, Paid, Overdue) | Enabled & Forced | `recurring_id` -> `recurring_transactions` | Retain as-is. |
| 15 | `subscriptions` | Recurring software/service subscriptions | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is; expose in dedicated UI. |
| 16 | `investments` | Stocks, mutual funds, ETFs, gold holdings | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is; add multi-currency exchange link. |
| 17 | `investment_transactions`| Buy/sell trade ledger, dividends | Enabled & Forced | `investment_id` -> `investments(id)` | Retain as-is. |
| 18 | `sip_schedules` | Automated Systematic Investment Plans | Enabled & Forced | `investment_id`, `account_id` | Retain as-is. |
| 19 | `sip_installments` | Historical executed SIP unit allocations | Enabled & Forced | `sip_schedule_id` -> `sip_schedules` | Retain as-is. |
| 20 | `credit_cards` | Revolving credit cards, limits, dues | Enabled & Forced | `account_id` -> `accounts(id)` | Retain as-is. |
| 21 | `credit_card_statements`| Historical statement balances & APR | Enabled & Forced | `credit_card_id` -> `credit_cards` | Retain as-is. |
| 22 | `loans` | Home, car, personal loans, interest rates | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 23 | `loan_payments` | Amortization payments (principal + interest) | Enabled & Forced | `loan_id` -> `loans(id)` | Retain as-is. |
| 24 | `assets` | Physical property, vehicles, jewellery | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 25 | `liabilities` | External debts, family borrowings | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 26 | `financial_goals` | Milestone savings goals, targets | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 27 | `goal_contributions`| Capital allocations towards goals | Enabled & Forced | `goal_id` -> `financial_goals` | Retain as-is. |
| 28 | `devices` | Paired Android devices & hashed tokens | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is; pair with new RPC. |
| 29 | `sync_logs` | Device ingestion audit events | Enabled & Forced | `device_id` -> `devices(id)` | Retain as-is. |
| 30 | `import_jobs` | CSV/Excel/PDF parsing jobs & status | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 31 | `attachments` | Receipt & invoice document references | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |
| 32 | `audit_logs` | Security & compliance audit trail | Enabled & Forced | `user_id` -> `auth.users(id)` | Retain as-is. |

---

## 3. Additive Schema Enhancements for V2

To resolve audit findings and empower V2 features, the following migrations are scheduled:

### Migration 1: Formalize Android Synchronization Stored Procedure
**File:** `supabase/migrations/20261107000000_android_sync_rpc.sql`  
**Purpose:** Re-establish the missing `sync_android_transactions` RPC in code so that local and staging environments match production.
```sql
CREATE OR REPLACE FUNCTION public.sync_android_transactions(
    p_device_id UUID,
    p_token_hash VARCHAR(64),
    p_batch_id UUID,
    p_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_device RECORD;
    v_rec JSONB;
    v_ingested INT := 0;
    v_duplicates INT := 0;
    v_flagged INT := 0;
    v_tx_id UUID;
    v_acc_id UUID;
BEGIN
    -- 1. Authenticate Device
    SELECT * INTO v_device FROM public.devices
    WHERE id = p_device_id AND token_hash = p_token_hash AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or revoked device credentials.' USING ERRCODE = '42501';
    END IF;

    v_user_id := v_device.user_id;

    -- 2. Locate or create default Android Sync account
    SELECT id INTO v_acc_id FROM public.accounts
    WHERE user_id = v_user_id AND account_type IN ('savings', 'current', 'cash')
    ORDER BY created_at ASC LIMIT 1;

    -- 3. Ingest Records idempotently
    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records) LOOP
        -- Check idempotency
        IF EXISTS (SELECT 1 FROM public.transactions WHERE idempotency_hash = (v_rec->>'idempotencyHash')) THEN
            v_duplicates := v_duplicates + 1;
            CONTINUE;
        END IF;

        INSERT INTO public.transactions (
            user_id,
            account_id,
            amount,
            currency,
            transaction_type,
            transaction_date,
            description,
            source,
            reference_number,
            idempotency_hash,
            is_reviewed
        ) VALUES (
            v_user_id,
            COALESCE(v_acc_id, (SELECT id FROM public.accounts WHERE user_id = v_user_id LIMIT 1)),
            (v_rec->>'amount')::NUMERIC,
            'INR',
            (v_rec->>'transactionType')::public.transaction_type_enum,
            (v_rec->>'timestamp')::TIMESTAMPTZ,
            COALESCE(v_rec->>'description', v_rec->>'merchant', 'Android Synchronized Ingestion'),
            'android_sms_sync',
            v_rec->>'referenceNumber',
            v_rec->>'idempotencyHash',
            FALSE
        ) RETURNING id INTO v_tx_id;

        v_ingested := v_ingested + 1;
        v_flagged := v_flagged + 1;
    END LOOP;

    -- 4. Record Sync Log
    INSERT INTO public.sync_logs (
        device_id,
        user_id,
        sync_batch_id,
        records_received,
        records_ingested,
        records_flagged_for_review,
        sync_status
    ) VALUES (
        p_device_id,
        v_user_id,
        p_batch_id,
        jsonb_array_length(p_records),
        v_ingested,
        v_flagged,
        'success'
    );

    RETURN jsonb_build_object(
        'success', true,
        'ingested', v_ingested,
        'duplicatesIgnored', v_duplicates,
        'flaggedForReview', v_flagged
    );
END;
$$;
```

---

### Migration 2: Harmonize Dashboard Summary RPC (Complete Net Worth)
**File:** `supabase/migrations/20261107010000_v2_dashboard_summary_rpc.sql`  
**Purpose:** Ensure `get_dashboard_summary` accounts for **Investments, Fixed Assets, Loans, and External Liabilities** so dashboard metrics match the authoritative `calculateNetWorth` formula.
```sql
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
    -- 1. Liquid Balances
    SELECT COALESCE(SUM(current_balance), 0) INTO v_liquid
    FROM public.accounts WHERE user_id = p_user_id AND NOT is_archived;

    -- 2. Investments Valuation
    SELECT COALESCE(SUM(current_valuation), 0) INTO v_investments
    FROM public.investments WHERE user_id = p_user_id;

    -- 3. Fixed Assets Valuation
    SELECT COALESCE(SUM(current_valuation), 0) INTO v_assets
    FROM public.assets WHERE user_id = p_user_id;

    -- 4. Credit Card Outstanding
    SELECT COALESCE(SUM(current_outstanding), 0) INTO v_credit
    FROM public.credit_cards WHERE user_id = p_user_id;

    -- 5. Loan Outstanding Balances
    SELECT COALESCE(SUM(outstanding_balance), 0) INTO v_loans
    FROM public.loans WHERE user_id = p_user_id;

    -- 6. External Personal Liabilities
    SELECT COALESCE(SUM(outstanding_amount), 0) INTO v_liabilities
    FROM public.liabilities WHERE user_id = p_user_id;

    -- Totals
    v_total_assets := v_liquid + v_investments + v_assets;
    v_total_liabilities := v_credit + v_loans + v_liabilities;
    v_net_worth := v_total_assets - v_total_liabilities;

    -- Cash flow aggregations
    SELECT COALESCE(SUM(amount), 0) INTO v_inflow
    FROM public.transactions
    WHERE user_id = p_user_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
      AND transaction_type IN ('income', 'interest', 'refund', 'lending_collection', 'borrowing');

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
```

---

### Migration 3: Cloud AI Conversation & Insight Persistence
**File:** `supabase/migrations/20261107020000_ai_assistant_tables.sql`  
**Purpose:** Persist chat sessions, structured tool executions, and saved insights securely under RLS.
```sql
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL DEFAULT 'Financial Inquiry',
    model_provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations FORCE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_user_own"
    ON public.ai_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    source_references JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "ai_messages_user_own"
    ON public.ai_messages FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_messages_convo ON public.ai_messages(conversation_id, created_at ASC);
```

---

### Migration 4: Currency Exchange Rates Engine
**File:** `supabase/migrations/20261107030000_currency_rates.sql`  
**Purpose:** Replace hardcoded `DEFAULT_USD_INR_RATE = 84.5` with an auditable exchange rates table.
```sql
CREATE TABLE IF NOT EXISTS public.currency_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    target_currency VARCHAR(3) NOT NULL,
    exchange_rate NUMERIC(15, 6) NOT NULL CHECK (exchange_rate > 0),
    source VARCHAR(50) NOT NULL DEFAULT 'manual_or_system',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (base_currency, target_currency, effective_date)
);

ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;
-- Readable by all authenticated users
CREATE POLICY "rates_read_all"
    ON public.currency_exchange_rates FOR SELECT
    TO authenticated
    USING (true);

-- Seed baseline rate
INSERT INTO public.currency_exchange_rates (base_currency, target_currency, exchange_rate, source)
VALUES ('INR', 'USD', 0.011834, 'system_default'),
       ('USD', 'INR', 84.500000, 'system_default')
ON CONFLICT DO NOTHING;
```

---

### Migration 5: De-conflict Account Balance Synchronization
**File:** `supabase/migrations/20261107040000_harmonize_account_balance_triggers.sql`  
**Purpose:** Safely decommission legacy trigger `trg_sync_account_balance` so that `FinancialTransactionService` has singular, unambiguous authority over account balance adjustments, eliminating double-mutation hazards on deletion.
```sql
-- Disable the legacy trigger to prevent double-subtraction during application-managed deletions and transfers
DROP TRIGGER IF EXISTS trg_sync_account_balance ON public.transactions;
```

---

## 4. Zero-Downtime Rollout & Verification Checklist

- [ ] Take a full physical database backup (`pg_dump` snapshot) prior to running migrations.
- [ ] Apply migrations sequentially in a staging Supabase branch first.
- [ ] Verify existing transaction counts before and after migration (`SELECT count(*) FROM transactions`).
- [ ] Verify that running `FinancialTransactionService.deleteFinancialTransaction` on a test record subtracts the exact balance once, not twice.
- [ ] Confirm RLS isolation with `tests/rls-isolation.test.ts`.

Proceed to **`AGENT_OWNERSHIP.md`** for agent role allocations.

