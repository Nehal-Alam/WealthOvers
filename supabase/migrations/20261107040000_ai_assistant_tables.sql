-- ==============================================================================
-- WEALTHOVERS V2: AI Assistant Tables Migration
-- Phase 5: Provider-Independent Cloud AI Finance Assistant
-- Tables: public.ai_conversations, public.ai_messages
-- Strict RLS with user isolation. Additive migration only.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Financial Consultation',
    model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB DEFAULT NULL,
    tool_results JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_messages(user_id);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-run
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage own ai conversations" ON public.ai_conversations;
    DROP POLICY IF EXISTS "Users can manage own ai messages" ON public.ai_messages;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Policies for ai_conversations
CREATE POLICY "Users can manage own ai conversations"
    ON public.ai_conversations
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for ai_messages
CREATE POLICY "Users can manage own ai messages"
    ON public.ai_messages
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

