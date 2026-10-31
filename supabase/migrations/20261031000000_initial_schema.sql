-- ============================================================================
-- WealthOvers Initial Production Schema & Row Level Security Migration
-- Migration: 20261031000000_initial_schema.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE account_type_enum AS ENUM (
        'savings', 'current', 'salary', 'cash', 'upi_wallet',
        'fixed_deposit', 'recurring_deposit', 'credit_card',
        'loan_account', 'investment_demat', 'other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM (
        'income', 'expense', 'transfer', 'refund',
        'investment_buy', 'investment_sell',
        'loan_disbursement', 'loan_repayment'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_source_enum AS ENUM (
        'manual', 'csv_import', 'xlsx_import', 'pdf_import',
        'android_sms_sync', 'notification_sync', 'recurring_rule'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE recurrence_interval_enum AS ENUM (
        'daily', 'weekly', 'biweekly', 'monthly',
        'quarterly', 'half_yearly', 'yearly'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE investment_type_enum AS ENUM (
        'stock_in', 'stock_us', 'mutual_fund', 'etf',
        'sovereign_gold_bond', 'gold_physical', 'gold_digital',
        'fixed_deposit', 'recurring_deposit', 'ppf', 'epf',
        'nps', 'crypto', 'other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE loan_type_enum AS ENUM (
        'personal', 'home', 'education', 'vehicle',
        'credit_card_debt', 'loan_given', 'loan_received', 'other'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE device_status_enum AS ENUM (
        'active', 'revoked', 'pending_approval'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE import_status_enum AS ENUM (
        'pending', 'processing', 'completed', 'failed'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- CORE USERS & PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    locale VARCHAR(10) NOT NULL DEFAULT 'en-IN',
    financial_year_start_month SMALLINT NOT NULL DEFAULT 4 CHECK (financial_year_start_month BETWEEN 1 AND 12),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    is_privacy_mode BOOLEAN NOT NULL DEFAULT FALSE,
    theme_preference VARCHAR(10) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_type account_type_enum NOT NULL DEFAULT 'savings',
    institution_name VARCHAR(100) NOT NULL DEFAULT 'Cash / Generic',
    account_number_masked VARCHAR(20),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    initial_balance NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    current_balance NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    icon VARCHAR(50) NOT NULL DEFAULT 'Wallet',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CATEGORIES, SUBCATEGORIES & MERCHANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
    icon VARCHAR(50) NOT NULL DEFAULT 'Folder',
    color VARCHAR(20) NOT NULL DEFAULT '#6B7280',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_category UNIQUE (user_id, name, type)
);

CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    icon VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_category_subcategory UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    default_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_merchant UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.categorization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword_pattern TEXT NOT NULL,
    match_field VARCHAR(20) NOT NULL DEFAULT 'description' CHECK (match_field IN ('description', 'merchant', 'reference')),
    target_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    target_subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRANSACTIONS LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    destination_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transaction_type transaction_type_enum NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT,
    source transaction_source_enum NOT NULL DEFAULT 'manual',
    reference_number VARCHAR(100),
    original_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    idempotency_hash VARCHAR(64),
    is_reviewed BOOLEAN NOT NULL DEFAULT TRUE,
    parser_confidence NUMERIC(4, 3) DEFAULT 1.000,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- BUDGETS & PLANNING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_amount NUMERIC(15, 4) NOT NULL CHECK (total_amount >= 0),
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly', 'yearly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rollover_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rolled_over_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    alert_threshold_percent SMALLINT NOT NULL DEFAULT 85,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(15, 4) NOT NULL CHECK (allocated_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_budget_category UNIQUE (budget_id, category_id)
);

-- ============================================================================
-- RECURRING BILLS & SUBSCRIPTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transaction_type transaction_type_enum NOT NULL DEFAULT 'expense',
    recurrence_interval recurrence_interval_enum NOT NULL DEFAULT 'monthly',
    interval_count INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    next_occurrence_date DATE NOT NULL,
    auto_record BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    billing_cycle recurrence_interval_enum NOT NULL DEFAULT 'monthly',
    cost NUMERIC(15, 4) NOT NULL CHECK (cost >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    renewal_date DATE NOT NULL,
    cancellation_reminder_days INT NOT NULL DEFAULT 3,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INVESTMENTS & PORTFOLIO ENGINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    symbol VARCHAR(30),
    asset_type investment_type_enum NOT NULL,
    broker_name VARCHAR(100) NOT NULL DEFAULT 'Manual',
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    total_quantity NUMERIC(18, 6) NOT NULL DEFAULT 0.000000 CHECK (total_quantity >= 0),
    average_buy_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (average_buy_price >= 0),
    total_invested_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (total_invested_amount >= 0),
    current_nav_or_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (current_nav_or_price >= 0),
    current_valuation NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (current_valuation >= 0),
    last_price_update_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(15) NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'split', 'bonus')),
    transaction_date TIMESTAMPTZ NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 4) NOT NULL CHECK (unit_price >= 0),
    fees_and_taxes NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (fees_and_taxes >= 0),
    total_amount NUMERIC(15, 4) NOT NULL CHECK (total_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREDIT CARDS & DEBT MANAGEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
    card_name VARCHAR(100) NOT NULL,
    issuer_name VARCHAR(100) NOT NULL,
    last_four_digits VARCHAR(4) NOT NULL,
    credit_limit NUMERIC(15, 4) NOT NULL CHECK (credit_limit >= 0),
    current_outstanding NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (current_outstanding >= 0),
    statement_date_day SMALLINT NOT NULL CHECK (statement_date_day BETWEEN 1 AND 31),
    payment_due_day SMALLINT NOT NULL CHECK (payment_due_day BETWEEN 1 AND 31),
    apr_percentage NUMERIC(6, 4) DEFAULT 42.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credit_card_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    statement_period_start DATE NOT NULL,
    statement_period_end DATE NOT NULL,
    total_due NUMERIC(15, 4) NOT NULL CHECK (total_due >= 0),
    minimum_due NUMERIC(15, 4) NOT NULL CHECK (minimum_due >= 0),
    due_date DATE NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LOANS & LIABILITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    loan_type loan_type_enum NOT NULL DEFAULT 'personal',
    lender_or_borrower_name VARCHAR(120) NOT NULL,
    principal_amount NUMERIC(15, 4) NOT NULL CHECK (principal_amount > 0),
    annual_interest_rate NUMERIC(6, 4) NOT NULL CHECK (annual_interest_rate >= 0),
    tenure_months INT NOT NULL CHECK (tenure_months > 0),
    monthly_emi NUMERIC(15, 4) NOT NULL CHECK (monthly_emi >= 0),
    outstanding_balance NUMERIC(15, 4) NOT NULL CHECK (outstanding_balance >= 0),
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    emi_amount NUMERIC(15, 4) NOT NULL CHECK (emi_amount > 0),
    principal_component NUMERIC(15, 4) NOT NULL CHECK (principal_component >= 0),
    interest_component NUMERIC(15, 4) NOT NULL CHECK (interest_component >= 0),
    extra_prepayment NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (extra_prepayment >= 0),
    remaining_balance NUMERIC(15, 4) NOT NULL CHECK (remaining_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FIXED ASSETS & LIABILITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Real Estate',
    purchase_price NUMERIC(15, 4) NOT NULL CHECK (purchase_price >= 0),
    current_valuation NUMERIC(15, 4) NOT NULL CHECK (current_valuation >= 0),
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Personal Debt',
    total_amount NUMERIC(15, 4) NOT NULL CHECK (total_amount >= 0),
    outstanding_amount NUMERIC(15, 4) NOT NULL CHECK (outstanding_amount >= 0),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FINANCIAL GOALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    target_amount NUMERIC(15, 4) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 4) NOT NULL DEFAULT 0.0000 CHECK (current_amount >= 0),
    target_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.financial_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ANDROID DEVICES & SYNCHRONIZATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_model VARCHAR(100),
    device_token_hash VARCHAR(128) NOT NULL UNIQUE,
    status device_status_enum NOT NULL DEFAULT 'active',
    last_sync_at TIMESTAMPTZ,
    app_version VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_status VARCHAR(20) NOT NULL,
    records_received INT NOT NULL DEFAULT 0,
    records_ingested INT NOT NULL DEFAULT 0,
    records_flagged_for_review INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STATEMENT IMPORT JOBS & AUDITING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_format VARCHAR(10) NOT NULL,
    status import_status_enum NOT NULL DEFAULT 'pending',
    total_parsed INT NOT NULL DEFAULT 0,
    total_imported INT NOT NULL DEFAULT 0,
    total_duplicates INT NOT NULL DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    ip_address INET,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account ON public.transactions(user_id, account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON public.transactions(user_id, category_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.transactions(user_id, idempotency_hash) WHERE idempotency_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_user_archived ON public.accounts(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_investments_user ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON public.credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_date ON public.budgets(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_devices_user_token ON public.devices(user_id, device_token_hash);

-- ============================================================================
-- TRIGGERS: UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_merchants_updated_at ON public.merchants;
CREATE TRIGGER trg_merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_recurring_updated_at ON public.recurring_transactions;
CREATE TRIGGER trg_recurring_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_investments_updated_at ON public.investments;
CREATE TRIGGER trg_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_credit_cards_updated_at ON public.credit_cards;
CREATE TRIGGER trg_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_loans_updated_at ON public.loans;
CREATE TRIGGER trg_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TRIGGER: ACCOUNT BALANCE SYNCHRONIZATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        IF OLD.transaction_type = 'income' OR OLD.transaction_type = 'refund' THEN
            UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.transaction_type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.transaction_type = 'transfer' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
            IF OLD.destination_account_id IS NOT NULL THEN
                UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.destination_account_id;
            END IF;
        END IF;
    END IF;

    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.transaction_type = 'income' OR NEW.transaction_type = 'refund' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.transaction_type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.transaction_type = 'transfer' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
            IF NEW.destination_account_id IS NOT NULL THEN
                UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.destination_account_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_account_balance ON public.transactions;
CREATE TRIGGER trg_sync_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_account_balance();

-- ============================================================================
-- TRIGGER: AUTOMATED USER PROVISIONING ON AUTH.USERS INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Provision User Profile
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

  -- 2. Provision User Settings (India / INR Defaults)
  INSERT INTO public.user_settings (user_id, currency, locale, financial_year_start_month, timezone)
  VALUES (NEW.id, 'INR', 'en-IN', 4, 'Asia/Kolkata')
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Seed Default Categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_system)
  VALUES
    (NEW.id, 'Salary', 'income', 'Briefcase', '#10B981', true),
    (NEW.id, 'Freelancing', 'income', 'Laptop', '#06B6D4', true),
    (NEW.id, 'Investments', 'income', 'TrendingUp', '#8B5CF6', true),
    (NEW.id, 'Food & Dining', 'expense', 'Utensils', '#F59E0B', true),
    (NEW.id, 'Groceries', 'expense', 'ShoppingCart', '#10B981', true),
    (NEW.id, 'Shopping', 'expense', 'ShoppingBag', '#EC4899', true),
    (NEW.id, 'Transportation', 'expense', 'Car', '#3B82F6', true),
    (NEW.id, 'Housing & Rent', 'expense', 'Home', '#6366F1', true),
    (NEW.id, 'Utilities', 'expense', 'Zap', '#EAB308', true),
    (NEW.id, 'Healthcare', 'expense', 'Activity', '#EF4444', true),
    (NEW.id, 'Entertainment', 'expense', 'Film', '#8B5CF6', true),
    (NEW.id, 'Miscellaneous', 'expense', 'MoreHorizontal', '#6B7280', true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_card_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_statements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities FORCE ROW LEVEL SECURITY;

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals FORCE ROW LEVEL SECURITY;

ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "settings_all_own" ON public.user_settings;
CREATE POLICY "settings_all_own" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts_all_own" ON public.accounts;
CREATE POLICY "accounts_all_own" ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_all_own" ON public.categories;
CREATE POLICY "categories_all_own" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subcategories_all_own" ON public.subcategories;
CREATE POLICY "subcategories_all_own" ON public.subcategories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchants_all_own" ON public.merchants;
CREATE POLICY "merchants_all_own" ON public.merchants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rules_all_own" ON public.categorization_rules;
CREATE POLICY "rules_all_own" ON public.categorization_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_all_own" ON public.transactions;
CREATE POLICY "transactions_all_own" ON public.transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_all_own" ON public.budgets;
CREATE POLICY "budgets_all_own" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budget_cat_all_own" ON public.budget_categories;
CREATE POLICY "budget_cat_all_own" ON public.budget_categories FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_categories.budget_id AND b.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_categories.budget_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "recurring_all_own" ON public.recurring_transactions;
CREATE POLICY "recurring_all_own" ON public.recurring_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_all_own" ON public.subscriptions;
CREATE POLICY "subscriptions_all_own" ON public.subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "investments_all_own" ON public.investments;
CREATE POLICY "investments_all_own" ON public.investments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "inv_transactions_all_own" ON public.investment_transactions;
CREATE POLICY "inv_transactions_all_own" ON public.investment_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "credit_cards_all_own" ON public.credit_cards;
CREATE POLICY "credit_cards_all_own" ON public.credit_cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "statements_all_own" ON public.credit_card_statements;
CREATE POLICY "statements_all_own" ON public.credit_card_statements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "loans_all_own" ON public.loans;
CREATE POLICY "loans_all_own" ON public.loans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "loan_payments_all_own" ON public.loan_payments;
CREATE POLICY "loan_payments_all_own" ON public.loan_payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "assets_all_own" ON public.assets;
CREATE POLICY "assets_all_own" ON public.assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "liabilities_all_own" ON public.liabilities;
CREATE POLICY "liabilities_all_own" ON public.liabilities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goals_all_own" ON public.financial_goals;
CREATE POLICY "goals_all_own" ON public.financial_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_contrib_all_own" ON public.goal_contributions;
CREATE POLICY "goal_contrib_all_own" ON public.goal_contributions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "devices_all_own" ON public.devices;
CREATE POLICY "devices_all_own" ON public.devices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sync_logs_all_own" ON public.sync_logs;
CREATE POLICY "sync_logs_all_own" ON public.sync_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "import_jobs_all_own" ON public.import_jobs;
CREATE POLICY "import_jobs_all_own" ON public.import_jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "attachments_all_own" ON public.attachments;
CREATE POLICY "attachments_all_own" ON public.attachments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
