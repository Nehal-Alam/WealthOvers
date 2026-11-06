-- Migration: 20261107030000_currency_rates.sql
-- Description: Creates currency_exchange_rates table to eliminate hardcoded exchange rates,
-- enabling dynamic multi-currency conversions for international equities, commodities, and foreign assets.

CREATE TABLE IF NOT EXISTS public.currency_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    target_currency VARCHAR(3) NOT NULL,
    exchange_rate NUMERIC(15, 6) NOT NULL CHECK (exchange_rate > 0),
    source VARCHAR(50) NOT NULL DEFAULT 'system_default',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (base_currency, target_currency, effective_date)
);

-- Enable RLS
ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_exchange_rates FORCE ROW LEVEL SECURITY;

-- Readable by all authenticated users
DROP POLICY IF EXISTS "rates_read_all" ON public.currency_exchange_rates;
CREATE POLICY "rates_read_all"
    ON public.currency_exchange_rates FOR SELECT
    TO authenticated
    USING (true);

-- Seed baseline institutional conversion rates
INSERT INTO public.currency_exchange_rates (base_currency, target_currency, exchange_rate, source)
VALUES 
    ('INR', 'USD', 0.011834, 'system_default'),
    ('USD', 'INR', 84.500000, 'system_default'),
    ('EUR', 'INR', 91.250000, 'system_default'),
    ('GBP', 'INR', 108.800000, 'system_default')
ON CONFLICT (base_currency, target_currency, effective_date) DO NOTHING;

