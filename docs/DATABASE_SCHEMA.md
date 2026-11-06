# WealthOvers — Database Schema & Data Dictionary

**Database:** PostgreSQL 15 (Supabase Managed)  
**Schema Owner:** Agent B (Database Engineer)  
**Reviewed by:** Agent A (Technical Architect)  
**Last Synchronized:** November 2026

---

## 1. Schema Topology & Table Inventory

The WealthOvers database schema comprises **32 production tables** organized into core accounting domains:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE IDENTITY & PROFILES                        │
│ profiles, user_settings, devices, sync_logs, audit_logs               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    ACCOUNTS & PHYSICAL BALANCE SHEET                   │
│ accounts, assets, liabilities                                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  UNIFIED TRANSACTION LEDGER (MASTER)                   │
│ transactions, ledger_entries, attachments, categorization_rules        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  INVESTMENTS │            │ DEBT & LOANS │            │   PLANNING   │
│ investments  │            │ credit_cards │            │ budgets      │
│ inv_trans    │            │ statements   │            │ budget_cats  │
│ sip_schedules│            │ loans        │            │ rollovers    │
│ sip_installs │            │ loan_payments│            │ goals, bills │
└──────────────┘            └──────────────┘            └──────────────┘
```

---

## 2. Table Catalog & Detailed DDL Specifications

### A. Core Accounting & Ledger Tables

#### 1. `public.transactions`
Master financial transaction record linking all financial activities.
```sql
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_number VARCHAR(30) NOT NULL UNIQUE,
    transaction_type transaction_type_enum NOT NULL,
    transaction_subtype VARCHAR(50),
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    description TEXT NOT NULL,
    merchant_or_person VARCHAR(150),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    status transaction_status_enum NOT NULL DEFAULT 'completed',
    reference_number VARCHAR(100),
    notes TEXT,
    tags TEXT[],
    source_module VARCHAR(50) NOT NULL DEFAULT 'transactions',
    related_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    transfer_group_id UUID,
    investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    loan_payment_id UUID REFERENCES public.loan_payments(id) ON DELETE SET NULL,
    sip_schedule_id UUID REFERENCES public.sip_schedules(id) ON DELETE SET NULL,
    sip_installment_id UUID REFERENCES public.sip_installments(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    is_reviewed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 2. `public.ledger_entries`
Double-entry balanced accounting ledger.
```sql
CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    entity_type ledger_entity_type_enum NOT NULL,
    entity_id UUID,
    entry_type ledger_entry_type_enum NOT NULL, -- 'debit' or 'credit'
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 3. `public.accounts`
```sql
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_type account_type_enum NOT NULL, -- 'savings', 'current', 'cash', 'bank', 'wallet', 'fixed_deposit', 'other'
    institution_name VARCHAR(100),
    account_number_mask VARCHAR(10),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    current_balance NUMERIC(15, 4) NOT NULL DEFAULT 0,
    opening_balance NUMERIC(15, 4) NOT NULL DEFAULT 0,
    color VARCHAR(20) DEFAULT '#244B3C',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### B. Investments & SIP Tables

#### 4. `public.investments`
```sql
CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    symbol VARCHAR(30),
    asset_class asset_class_enum NOT NULL, -- 'stocks', 'mutual_funds', 'etf', 'crypto', 'gold', 'epf', 'ppf', 'nps', 'bonds'
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    total_quantity NUMERIC(18, 6) NOT NULL DEFAULT 0,
    average_buy_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
    total_invested_amount NUMERIC(15, 4) NOT NULL DEFAULT 0,
    current_nav_or_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
    current_valuation NUMERIC(15, 4) NOT NULL DEFAULT 0,
    last_price_update_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 5. `public.sip_schedules`
```sql
CREATE TABLE public.sip_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    sip_name VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    frequency recurrence_interval_enum NOT NULL DEFAULT 'monthly',
    deduction_day SMALLINT NOT NULL CHECK (deduction_day BETWEEN 1 AND 31),
    next_due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 6. `public.sip_installments`
```sql
CREATE TABLE public.sip_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sip_id UUID NOT NULL REFERENCES public.sip_schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    processed_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    units_allotted NUMERIC(18, 6) NOT NULL DEFAULT 0,
    nav_at_execution NUMERIC(15, 4) NOT NULL CHECK (nav_at_execution > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'processed',
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### C. Loans, Debts & Credit Cards

#### 7. `public.loans`
```sql
CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    loan_type loan_type_enum NOT NULL, -- 'personal', 'home', 'education', 'vehicle', 'credit_card_debt', 'loan_given', 'loan_received', 'other'
    lender_or_borrower_name VARCHAR(150) NOT NULL,
    principal_amount NUMERIC(15, 4) NOT NULL CHECK (principal_amount > 0),
    annual_interest_rate NUMERIC(6, 4) NOT NULL CHECK (annual_interest_rate >= 0),
    tenure_months INTEGER NOT NULL CHECK (tenure_months > 0),
    monthly_emi NUMERIC(15, 4) NOT NULL CHECK (monthly_emi >= 0),
    outstanding_balance NUMERIC(15, 4) NOT NULL CHECK (outstanding_balance >= 0),
    start_date DATE NOT NULL,
    maturity_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 8. `public.loan_payments`
```sql
CREATE TABLE public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    emi_amount NUMERIC(15, 4) NOT NULL CHECK (emi_amount > 0),
    principal_component NUMERIC(15, 4) NOT NULL CHECK (principal_component >= 0),
    interest_component NUMERIC(15, 4) NOT NULL CHECK (interest_component >= 0),
    extra_prepayment NUMERIC(15, 4) NOT NULL DEFAULT 0 CHECK (extra_prepayment >= 0),
    remaining_balance NUMERIC(15, 4) NOT NULL CHECK (remaining_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Row-Level Security (RLS) Policy Audit

Every single table in `public` schema has `ROW LEVEL SECURITY` strictly enabled.
* Tenant isolation pattern: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
* No public or unauthenticated read access is permitted on financial entities.
* Service role bypass is limited to administrative background automation tasks.
