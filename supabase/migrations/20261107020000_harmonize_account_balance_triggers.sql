-- Migration: 20261107020000_harmonize_account_balance_triggers.sql
-- Description: Decommissions legacy trigger trg_sync_account_balance to prevent double-subtraction during application-managed deletions and transfers.
-- FinancialTransactionService now operates as the sole authoritative manager for account balance mutations based on balanced double-entry ledger entries.

DROP TRIGGER IF EXISTS trg_sync_account_balance ON public.transactions;

