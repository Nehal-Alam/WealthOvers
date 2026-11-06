-- Migration: Advanced Plan Section Architecture & Complete Entity Linking
-- Supports advanced budgets, category breakdowns, rollovers, financial goals, recurring bills, and calendar occurrences

-- 1. Budgets Enhancements
ALTER TABLE public.budgets
    ADD COLUMN IF NOT EXISTS budget_type VARCHAR(30) DEFAULT 'overall_monthly',
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rollover_mode VARCHAR(20) DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS rollover_limit NUMERIC(15, 4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS alert_thresholds INTEGER[] DEFAULT '{50, 75, 90, 100}';

-- 2. Budget Categories Enhancements
ALTER TABLE public.budget_categories
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS alert_threshold_percent SMALLINT DEFAULT 85;

-- 3. Budget Rollovers Log Table
CREATE TABLE IF NOT EXISTS public.budget_rollovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    unspent_amount NUMERIC(15, 4) NOT NULL,
    rolled_over_amount NUMERIC(15, 4) NOT NULL,
    rollover_mode VARCHAR(20) NOT NULL DEFAULT 'full',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.budget_rollovers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_rollovers' AND policyname = 'budget_rollovers_all_own') THEN
        CREATE POLICY budget_rollovers_all_own ON public.budget_rollovers
            FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Financial Goals Enhancements
ALTER TABLE public.financial_goals
    ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS planned_contribution_amount NUMERIC(15, 4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS contribution_frequency VARCHAR(20) DEFAULT 'monthly',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS icon_or_image VARCHAR(100);

-- 5. Goal Contributions Enhancements
ALTER TABLE public.goal_contributions
    ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contribution_type VARCHAR(20) DEFAULT 'deposit';

-- 6. Recurring Transactions Enhancements
ALTER TABLE public.recurring_transactions
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS is_variable_amount BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS is_autopay BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 7. Bill Occurrences Table
CREATE TABLE IF NOT EXISTS public.bill_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_id UUID NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount NUMERIC(15, 4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'paid', 'overdue', 'skipped', 'cancelled')),
    paid_date DATE,
    paid_amount NUMERIC(15, 4),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bill_occurrences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bill_occurrences' AND policyname = 'bill_occurrences_all_own') THEN
        CREATE POLICY bill_occurrences_all_own ON public.bill_occurrences
            FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_status ON public.financial_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_txns_user_status ON public.recurring_transactions(user_id, is_active, next_occurrence_date);
CREATE INDEX IF NOT EXISTS idx_bill_occurrences_user_date ON public.bill_occurrences(user_id, due_date, status);
