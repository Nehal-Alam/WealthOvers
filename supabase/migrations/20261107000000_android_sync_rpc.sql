-- Migration: 20261107000000_android_sync_rpc.sql
-- Description: Establishes authoritative sync_android_transactions RPC for secure, idempotent, token-authenticated Android device ingestion

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
    v_idempotency VARCHAR(64);
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
    WHERE user_id = v_user_id AND account_type IN ('savings', 'current', 'cash', 'upi_wallet')
    ORDER BY created_at ASC LIMIT 1;

    IF v_acc_id IS NULL THEN
        INSERT INTO public.accounts (
            user_id,
            name,
            account_type,
            institution_name,
            currency,
            current_balance
        ) VALUES (
            v_user_id,
            'Cash / Wallet',
            'cash',
            'Mobile Wallet',
            'INR',
            0
        ) RETURNING id INTO v_acc_id;
    END IF;

    -- 3. Ingest Records idempotently
    FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records) LOOP
        v_idempotency := v_rec->>'idempotencyHash';

        -- Check idempotency
        IF v_idempotency IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.transactions WHERE idempotency_hash = v_idempotency
        ) THEN
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
            v_acc_id,
            (v_rec->>'amount')::NUMERIC,
            COALESCE(v_rec->>'currency', 'INR'),
            (v_rec->>'transactionType')::public.transaction_type_enum,
            (v_rec->>'timestamp')::TIMESTAMPTZ,
            COALESCE(v_rec->>'description', v_rec->>'merchant', 'Android Synchronized Ingestion'),
            'android_sms_sync',
            v_rec->>'referenceNumber',
            v_idempotency,
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

    -- 5. Update Device last_synced_at timestamp
    UPDATE public.devices
    SET last_synced_at = NOW(),
        updated_at = NOW()
    WHERE id = p_device_id;

    RETURN jsonb_build_object(
        'success', true,
        'ingested', v_ingested,
        'duplicatesIgnored', v_duplicates,
        'flaggedForReview', v_flagged
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_android_transactions(UUID, VARCHAR, UUID, JSONB) TO authenticated, service_role, anon;

