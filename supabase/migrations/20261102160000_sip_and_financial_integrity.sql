-- Migration: SIP Schedules & Financial Integrity
-- Supports automated Systematic Investment Plans with idempotency and double-entry auditing

CREATE TABLE IF NOT EXISTS public.sip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    sip_name VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    frequency recurrence_interval_enum NOT NULL DEFAULT 'monthly',
    deduction_day SMALLINT NOT NULL CHECK (deduction_day BETWEEN 1 AND 31),
    next_due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sip_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sip_id UUID NOT NULL REFERENCES public.sip_schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    processed_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    units_allotted NUMERIC(18, 6),
    nav_at_execution NUMERIC(15, 4),
    status VARCHAR(20) NOT NULL DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'failed', 'skipped')),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sip_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_installments ENABLE ROW LEVEL SECURITY;

-- Policies for sip_schedules
CREATE POLICY "Users can manage their own sip schedules"
    ON public.sip_schedules
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for sip_installments
CREATE POLICY "Users can view their own sip installments"
    ON public.sip_installments
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sip_schedules_user ON public.sip_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_sip_schedules_due ON public.sip_schedules(is_active, next_due_date);
CREATE INDEX IF NOT EXISTS idx_sip_installments_sip ON public.sip_installments(sip_id);
CREATE INDEX IF NOT EXISTS idx_sip_installments_user ON public.sip_installments(user_id);

