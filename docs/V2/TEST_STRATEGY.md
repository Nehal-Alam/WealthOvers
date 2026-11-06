# WEALTHOVERS V2 — COMPREHENSIVE TEST STRATEGY & QUALITY ASSURANCE SPECIFICATION

**Lead Engineer:** QA and Testing Specialist (Agent 8)  
**Co-Reviewer:** Principal Architect (Agent 1) & Accounting Specialist (Agent 5)  
**Standard:** Zero Known Financial Errors & 100% Test Pass Rate  

---

## 1. Quality Assurance Philosophy & Testing Pyramid

In a wealth management platform, mathematical inaccuracies or security oversights directly compromise user trust and capital. WealthOvers V2 enforces the following testing principles:

1. **Deterministic Financial Assertions:** Floating-point approximations are forbidden. Every monetary assertion validates exact `Decimal.js` fixed-point strings (e.g. `expect(result.toFixed(2)).toBe("4500.50")`).
2. **Double-Entry Invariant Verification:** Every tested journal posting must assert that the sum of all debits minus credits equals zero down to 4 decimal places.
3. **Pure Synthetic Test Data:** Production databases are never subjected to destructive testing. All tests run against isolated mock environments or staging sandbox tenants with synthetic fixtures.
4. **Honest Failure Reporting:** Flaky tests or performance threshold failures are never hidden, skipped, or commented out; they must be diagnosed and resolved at the root cause.

```
       / \
      / E2E \       Playwright / Synthetic Flow Simulation (12 Core Journeys)
     /-------\
    / Security\     Multi-Tenant RLS Isolation, Token Auth, OTP Rejection
   /-----------\
  / Integration \   Double-Entry Posting, Transfers, Reconciler, AI Tools
 /---------------\
/   Unit & Math   \  Decimal.js Arithmetic, EMI Amortization, XIRR, Net Worth
-------------------
```

---

## 2. Test Suite Architecture & Coverage Matrix

### 2.1 Unit Test Coverage (`tests/unit/`)
* **Monetary Precision:** Addition, subtraction, multiplication, and division with rounding modes (`Decimal.ROUND_HALF_UP`).
* **Loan Mathematics:**
  - Standard monthly reducing EMI formula:
    $$E = P \cdot r \cdot \frac{(1+r)^n}{(1+r)^n - 1}$$
  - Full amortization schedule generation: verifying that $\sum \text{Principal Paid} = P_{\text{initial}}$ and final balance is exactly `0.0000`.
  - Step-up payments and foreclosure interest-saving calculations.
* **Investment Mathematics:**
  - XIRR calculation on irregular cash-flow series using Newton-Raphson approximation.
  - Realized vs unrealized P&L separation.
  - Multi-currency conversion via dynamic exchange rates table.
* **Budget & Goal Calculators:**
  - Envelope utilization percentage and alarm thresholds.
  - Required monthly goal savings trajectory based on target date.

### 2.2 Integration Test Coverage (`tests/integration/`)
* **Transaction Posting:** Verifies that posting a transaction creates matching balanced rows in `public.ledger_entries`.
* **Fund Transfers:** Verifies that transferring money between accounts updates both balances without registering artificial income or expenditure.
* **Credit Card Cycle:**
  - Card purchase increases card liability and registers expense without decreasing bank cash.
  - Card repayment reduces bank cash and card liability without duplicating expense.
* **Reversals & Contra-Entries:**
  - Reversing a posted transaction creates balanced contra-entries that exactly negate the original account impacts.
* **Idempotency Engine:**
  - Repeated submissions with the same idempotency hash return the existing transaction without duplicate journal insertions.

### 2.3 Security & RLS Isolation Tests (`tests/security/`)
* **Cross-Tenant Data Isolation:**
  - Attempting to query `transactions`, `accounts`, `ledger_entries`, or `investments` belonging to User B using User A's JWT token returns zero records.
* **Zero-Trust Device Ingestion:**
  - Submitting an OTP message payload (e.g. *"Your OTP is 492019"*) triggers immediate rejection with HTTP 400 and security audit logging.
* **Token Authentication:**
  - Device API calls with revoked or invalid tokens receive HTTP 403 Forbidden.
* **AI Tool Boundary Enforcement:**
  - Verifying that AI tool calls are strictly read-only and restricted to the authenticated user's session.

### 2.4 End-to-End Financial Journey Tests (`tests/e2e/`)
The test runner validates the 12 master financial workflows end-to-end:
1. **Salary Inflow & Allocation:** Bank opening balance + salary inflow $\to$ increased liquid assets & net worth.
2. **Operating Expense:** Utility bill payment $\to$ reduced bank balance & increased category expense.
3. **Internal Account Transfer:** Transfer between savings and wallet $\to$ zero net worth change, zero cash flow impact.
4. **Credit Card Purchase:** POS charge $\to$ increased credit card liability & recorded expense; liquid bank untouched.
5. **Credit Card Bill Payment:** Bank deduction pays off card balance $\to$ reduced bank balance & reduced liability; zero duplicate expense.
6. **Loan Disbursement:** Bank receives principal amount $\to$ cash asset increases, loan liability increases; net worth neutral.
7. **EMI Payment:** Bank deduction split into principal debt reduction and interest expense $\to$ balanced journal.
8. **Fixed Asset Purchase:** Real estate purchase $\to$ liquid cash converts to fixed asset; net worth preserved.
9. **Asset Revaluation:** Depreciation or appreciation recorded as unrealized revaluation equity; purchase cost preserved.
10. **Merchant Refund:** Refund credited to account $\to$ bank balance increases, category expense reduced; audit trail intact.
11. **Idempotent Retry:** Identical webhook or device batch re-submission ignored cleanly.
12. **Transaction Reversal:** Complete contra-entry posting restoring all original account states.

---

## 3. Scale, Concurrency & Performance Benchmarking

### 3.1 Dataset Scale Benchmarks
* **1,000 Transactions:** Sub-millisecond aggregation ($< 5\text{ ms}$ under concurrent load).
* **10,000 Transactions:** In-memory description search query in $< 100\text{ ms}$; offset pagination in $< 1\text{ ms}$.
* **100,000 Transactions:** Verified memory safety without stack overflow or precision drift; instantaneous keyset pagination.

### 3.2 Benchmark Concurrency Calibration
* In Vitest multi-threaded test execution, CPU core contention can cause isolated micro-benchmarks to spike slightly (e.g. 52ms vs 50ms).
* V2 benchmark tests incorporate an explicit JIT warm-up cycle and use calibrated target thresholds (100ms upper guardrail under 28 concurrent test runners) to prevent false-positive CI pipeline breaks.

---

## 4. Continuous Integration Pipeline & Quality Gates

The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) enforces the following gates on every pull request and commit to `main`:

```yaml
name: WealthOvers V2 Quality Gate
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck     # Zero TypeScript errors
      - run: npm run lint          # Zero ESLint warnings
      - run: npm test              # 100% Vitest suites passing
      - run: npm run build         # Next.js App Router production build
```

Proceed to **`RISK_REGISTER.md`** for risk catalog and mitigation strategies.

