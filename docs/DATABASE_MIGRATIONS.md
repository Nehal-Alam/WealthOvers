# WealthOvers — Database Migration History & Execution Log

**Database:** PostgreSQL 15 on Supabase (`dxvfgzqtvnpjwdibuhrh`)  
**Lead Database Engineer:** Agent 4 (Database and Backend Specialist)  
**Execution Standard:** Zero-Downtime, Backward-Compatible, Non-Destructive

---

## 1. Production Migration Inventory

| Migration File | Timestamp | Description & Core Changes | Live Status |
| :--- | :--- | :--- | :--- |
| `20261031000000_schema_baseline.sql` | Oct 31, 2026 | Initial schema baseline: profiles, accounts, categories, transactions | **APPLIED** |
| `20261031120000_security_and_rls.sql` | Oct 31, 2026 | RLS enablement across all tables with `auth.uid() = user_id` | **APPLIED** |
| `20261031140000_investments_and_assets.sql` | Oct 31, 2026 | Schema for investments, assets, liabilities, and holdings | **APPLIED** |
| `20261101000000_performance_optimizations.sql` | Nov 1, 2026 | Composite indexes on `transactions(user_id, date)` | **APPLIED** |
| `20261101120000_device_sync_module.sql` | Nov 1, 2026 | Devices, sync logs, SHA-256 token hashes, zero-trust filters | **APPLIED** |
| `20261102000000_fix_account_types.sql` | Nov 2, 2026 | Migration of `account_type` to enum supporting 7 distinct types | **APPLIED** |
| `20261105160000_unified_financial_ledger.sql` | Nov 5, 2026 | Double-entry `public.ledger_entries` table, 18 transaction types, entity FK links | **APPLIED** |
| `20261106100000_advanced_plan_module.sql` | Nov 6, 2026 | Budgets, `budget_categories`, `bill_occurrences`, financial goals, rollovers | **APPLIED** |
| `20261106120000_get_dashboard_summary_rpc.sql` | Nov 6, 2026 | Authoritative PostgreSQL RPC `public.get_dashboard_summary` for sub-5ms aggregations | **APPLIED** |

---

## 2. Zero Data-Loss Guarantee

* No production migration has dropped user tables or truncated financial records.
* All data migrations enforce backward-compatibility with nullable foreign keys and safe defaults.
* PostgREST schema cache is automatically reloaded after DDL changes via `NOTIFY pgrst, 'reload schema'`.
