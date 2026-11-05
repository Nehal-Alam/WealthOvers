# WealthOvers — Unified Financial Transaction Ledger & Accounting Architecture

**Application:** [https://wealthovers.vercel.app/](https://wealthovers.vercel.app/)  
**Document Version:** 2.0  
**Target Environment:** Next.js 15.5.28 App Router, Supabase PostgreSQL 15, TypeScript 5, Decimal.js (28-digit precision)  
**Status:** **Production Ready & Enforced**

---

## 1. System Overview & Core Accounting Invariants

Every financial activity within WealthOvers is recorded in **one centralised transaction ledger** backed by strict **double-entry bookkeeping** principles (`ledger_entries`). Financial operations are never isolated in disconnected modules.

### Core Accounting Principles
1. **Double-Entry Balance Invariant:**  
   Every transaction consists of at least two ledger entries. For every transaction, within the same currency:
   $$\sum \text{Debits} = \sum \text{Credits}$$
   Any unbalanced transaction where $|\sum \text{Debits} - \sum \text{Credits}| > 0.0001$ is immediately rejected and rolled back at the service boundary.
2. **Standard Financial Asset & Liability Conventions:**
   - **Assets** (Bank accounts, Cash, Wallets, Investments, Physical Assets, Loan Receivables):
     - **Debit** increases asset value ($+$).
     - **Credit** decreases asset value ($-$).
   - **Liabilities** (Credit cards, Outstanding Loans, Borrowing Payables, Debts):
     - **Credit** increases liability debt ($+$).
     - **Debit** decreases liability debt ($-$).
   - **Income:**
     - **Credit** increases income ($+$).
     - **Debit** decreases income ($-$).
   - **Expenses:**
     - **Debit** increases expense ($+$).
     - **Credit** decreases expense / contra-expense ($-$).
3. **Immutability & Reversals:**  
   Posted transactions and ledger entries are never silently overwritten or mutated. Reversals produce balanced contra-entries that negate the financial impact while preserving full audit history.

---

## 2. Database Schema Architecture

### A. Master Transaction Record (`public.transactions`)
Each financial event is identified by a unique, human-readable identifier (e.g. `TXN-202611-10001`) generated atomically via a PostgreSQL sequence and trigger.

```sql
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_number VARCHAR(32) NOT NULL UNIQUE,
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    transaction_type transaction_type_enum NOT NULL,
    transaction_subtype VARCHAR(50),
    transaction_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    merchant_or_person VARCHAR(150),
    payment_method VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    notes TEXT,
    reference_number VARCHAR(100),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_module VARCHAR(50) NOT NULL DEFAULT 'transactions',
    is_reviewed BOOLEAN NOT NULL DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    related_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    transfer_group_id UUID,
    investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL,
    credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    loan_payment_id UUID REFERENCES public.loan_payments(id) ON DELETE SET NULL,
    sip_schedule_id UUID REFERENCES public.sip_schedules(id) ON DELETE SET NULL,
    sip_installment_id UUID REFERENCES public.sip_installments(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    idempotency_hash VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### B. Double-Entry Accounting Ledger Entries (`public.ledger_entries`)
Every master transaction produces corresponding balanced debit and credit entries in `public.ledger_entries`:

```sql
CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount NUMERIC(15, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Supported Entity Types:
- `bank_account`, `cash_wallet`
- `credit_card_liability`
- `investment_holding`
- `loan_payable`, `loan_receivable`
- `tangible_asset`
- `income`, `expense`, `equity_adjustment`

---

## 3. Double-Entry Posting Rules by Financial Operation

| Operation | User Action | Debits | Credits | Net Worth Impact | Cash Flow Impact |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Income** | Receive Salary ₹40,000 in HDFC | Debit `bank_account` (₹40,000) | Credit `income` (₹40,000) | $+₹40,000$ | Inflow (+₹40k) |
| **Expense** | Spend ₹2,000 on Groceries from HDFC | Debit `expense` (₹2,000) | Credit `bank_account` (₹2,000) | $-₹2,000$ | Outflow (-₹2k) |
| **Bank Charges** | Annual card fee ₹500 debited | Debit `expense` (₹500) | Credit `bank_account` (₹500) | $-₹500$ | Outflow (-₹500) |
| **Internal Transfer** | Move ₹10,000 from HDFC to SBI | Debit `bank_account` SBI (₹10,000) | Credit `bank_account` HDFC (₹10,000) | ₹0 | Neutral (Excluded) |
| **Borrow Money** | Borrow ₹50,000 received in HDFC | Debit `bank_account` (₹50,000) | Credit `loan_payable` (₹50,000) | ₹0 | Inflow (+₹50k) |
| **Borrowing Repayment** | Pay ₹16,666 (₹15k principal + ₹1.6k int) | Debit `loan_payable` (₹15,000)<br>Debit `expense` (₹1,666) | Credit `bank_account` (₹16,666) | $-₹1,666$ | Outflow (-₹16.6k) |
| **Lend Money** | Lend ₹20,000 from SBI to friend | Debit `loan_receivable` (₹20,000) | Credit `bank_account` (₹20,000) | ₹0 | Outflow (-₹20k) |
| **Lending Collection** | Collect ₹5,000 principal + ₹250 int | Debit `bank_account` (₹5,250) | Credit `loan_receivable` (₹5,000)<br>Credit `income` (₹250) | $+₹250$ | Inflow (+₹5.25k) |
| **Credit Card Purchase** | Buy ₹3,500 fuel using credit card | Debit `expense` (₹3,500) | Credit `credit_card_liability` (₹3,500) | $-₹3,500$ | Bank Untouched! |
| **Credit Card Repayment**| Pay ₹3,500 credit card bill from HDFC | Debit `credit_card_liability` (₹3,500) | Credit `bank_account` (₹3,500) | ₹0 | Outflow (No 2nd expense) |
| **Investment Buy / SIP**| Invest ₹5,000 into Nifty 50 from HDFC | Debit `investment_holding` (₹5,000) | Credit `bank_account` (₹5,000) | ₹0 | Outflow (Asset swap) |
| **Investment Sell** | Redeem ₹8,000 mutual funds into HDFC | Debit `bank_account` (₹8,000) | Credit `investment_holding` (₹8,000) | ₹0 | Inflow (Asset swap) |
| **Refund** | Receive ₹1,200 merchant refund in HDFC | Debit `bank_account` (₹1,200) | Credit `expense` (₹1,200) | $+₹1,200$ | Inflow (+₹1.2k) |

---

## 4. Running Balance Ledger Engine

For any user account, the running balance is calculated deterministically with exact mathematical continuity:
$$\text{Running Balance}_i = \text{Running Balance}_{i-1} + \text{Money In}_i - \text{Money Out}_i$$

Where:
- For liquid accounts (Savings, Current, Cash, Wallet):
  - **Debit Posting** $\implies$ Money In ($+$)
  - **Credit Posting** $\implies$ Money Out ($-$)
- Available via `FinancialTransactionService.getAccountRunningBalanceHistory()` and surfaced in the UI through `AccountHistoryModal` accessible directly from the account card menu.

---

## 5. Entity Linking & Two-Way Traceability

The architecture enforces bidirectional navigation:
1. **From Transaction to Entity:**  
   Clicking any transaction opens `TransactionDetailModal`, displaying the master record, the double-entry postings table, and deep links to the affected account, loan, credit card, or investment holding.
2. **From Entity to Transaction History:**  
   - In **Loans:** Clicking any loan card opens `LoanTransactionsModal`, aggregating initial disbursements, monthly EMIs, and prepayments with inline editing and payment deletion.
   - In **Accounts:** Clicking "Running Ledger History" shows chronological inflows, outflows, and running balances.
   - In **Credit Cards:** Clicking card history shows all card charges and repayment transactions.

---

## 6. Verification & Automated Test Coverage

The system is validated by an automated test suite with 100% pass rate:
- `tests/unified-financial-ledger.test.ts` (13 tests verifying Scenarios 1–7)
- `tests/bug-fix-financial-integrity.test.ts` (19 tests)
- Full project test suite: **26 test files, 221 passed, 0 failed**.

