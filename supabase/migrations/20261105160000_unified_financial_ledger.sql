-- Migration: 20261105160000_unified_financial_ledger.sql
-- Unified Financial Transaction Ledger, Double-Entry Ledger Entries & Comprehensive Transaction Linking

-- 1. Ensure all transaction types exist in transaction_type_enum
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'borrowing';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'borrowing_repayment';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'lending';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'lending_collection';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'credit_card_purchase';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'credit_card_repayment';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'sip';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'interest';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'adjustment';
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'bank_charges';

-- 2. Sequence for human-readable transaction numbers (e.g. TXN-202611-10001)
CREATE SEQUENCE IF NOT EXISTS public.transaction_number_seq START WITH 10001;

CREATE OR REPLACE FUNCTION public.generate_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
        NEW.transaction_number := 'TXN-' || TO_CHAR(COALESCE(NEW.transaction_date, NOW()), 'YYYYMM') || '-' || LPAD(nextval('public.transaction_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Enhance public.transactions table with unified linking columns
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS transaction_number VARCHAR(32) UNIQUE,
    ADD COLUMN IF NOT EXISTS transaction_subtype VARCHAR(50),
    ADD COLUMN IF NOT EXISTS merchant_or_person TEXT,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS source_module VARCHAR(50) NOT NULL DEFAULT 'transactions',
    ADD COLUMN IF NOT EXISTS related_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS transfer_group_id UUID,
    ADD COLUMN IF NOT EXISTS investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS loan_payment_id UUID REFERENCES public.loan_payments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sip_schedule_id UUID REFERENCES public.sip_schedules(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sip_installment_id UUID REFERENCES public.sip_installments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trigger_generate_transaction_number ON public.transactions;
CREATE TRIGGER trigger_generate_transaction_number
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_transaction_number();

-- 4. Create public.ledger_entries table for double-entry bookkeeping
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS) on ledger_entries
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own ledger entries" ON public.ledger_entries;
CREATE POLICY "Users can manage own ledger entries"
    ON public.ledger_entries
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Indexes for unified transaction queries, account ledgers, and entity histories
CREATE INDEX IF NOT EXISTS idx_transactions_number ON public.transactions(transaction_number);
CREATE INDEX IF NOT EXISTS idx_transactions_related ON public.transactions(related_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_group ON public.transactions(transfer_group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_loan ON public.transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card ON public.transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_investment ON public.transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source_module ON public.transactions(source_module);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_date ON public.ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_txn ON public.ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON public.ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_entity ON public.ledger_entries(entity_type, entity_id);

-- 7. Backfill transaction_number for existing transactions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, transaction_date FROM public.transactions WHERE transaction_number IS NULL LOOP
        UPDATE public.transactions
        SET transaction_number = 'TXN-' || TO_CHAR(COALESCE(r.transaction_date, NOW()), 'YYYYMM') || '-' || LPAD(nextval('public.transaction_number_seq')::TEXT, 5, '0')
        WHERE id = r.id;
    END LOOP;
END;
$$;

-- 8. Backfill balanced ledger entries for existing transactions
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN SELECT * FROM public.transactions LOOP
        -- Only create if not already exists
        IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE transaction_id = t.id) THEN
            IF t.transaction_type = 'expense' THEN
                -- Debit: Expense
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.account_id, 'expense', t.category_id, 'debit', t.amount, t.currency, t.description, t.created_at);
                -- Credit: Bank Account
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.account_id, 'bank_account', t.account_id, 'credit', t.amount, t.currency, t.description, t.created_at);

            ELSIF t.transaction_type = 'income' THEN
                -- Debit: Bank Account
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.account_id, 'bank_account', t.account_id, 'debit', t.amount, t.currency, t.description, t.created_at);
                -- Credit: Income
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.account_id, 'income', t.category_id, 'credit', t.amount, t.currency, t.description, t.created_at);

            ELSIF t.transaction_type = 'investment_buy' THEN
                -- Debit: Investment Holding
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.account_id, 'investment_holding', t.investment_id, 'debit', t.amount, t.currency, t.description, t.created_at);
                -- Credit: Bank Account
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.account_id, 'bank_account', t.account_id, 'credit', t.amount, t.currency, t.description, t.created_at);

            ELSIF t.transaction_type = 'transfer' THEN
                -- Debit: Destination Account
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.destination_account_id, 'bank_account', t.destination_account_id, 'debit', t.amount, t.currency, t.description, t.created_at);
                -- Credit: Source Account
                INSERT INTO public.ledger_entries (transaction_id, user_id, account_id, entity_type, entity_id, entry_type, amount, currency, description, created_at)
                VALUES (t.id, t.user_id, t.account_id, 'bank_account', t.account_id, 'credit', t.amount, t.currency, t.description, t.created_at);
            END IF;
        END IF;
    END LOOP;
END;
$$;

