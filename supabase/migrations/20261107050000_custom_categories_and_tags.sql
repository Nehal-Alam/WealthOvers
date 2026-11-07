-- ============================================================================
-- WEALTHOVERS V2: CUSTOM CATEGORIES, SUBCATEGORIES & CUSTOM TAGS MANAGEMENT
-- ============================================================================

-- 1. Create Tags Table with Row Level Security
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#A8C7FA',
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_tag UNIQUE (user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_all_own" ON public.tags;
CREATE POLICY "tags_all_own" ON public.tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tags_user_name ON public.tags(user_id, name ASC);

-- 2. Enhance Categories Table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- Expand category type check constraint to include loan, debt, transfer
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check 
  CHECK (type IN ('income', 'expense', 'investment', 'loan', 'debt', 'transfer'));

-- 3. Enhance Subcategories Table
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- 4. Reassign Category Transactions RPC
CREATE OR REPLACE FUNCTION public.reassign_category_transactions(
    p_user_id UUID,
    p_old_category_id UUID,
    p_new_category_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE public.transactions
    SET category_id = p_new_category_id,
        subcategory_id = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id AND category_id = p_old_category_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
