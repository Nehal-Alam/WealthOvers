# WealthOvers — Financial Calculation & Business Logic Engine

**Document Version**: 2.0.0  
**Author**: Financial Software Architect & Quantitative Systems Specialist  
**Date**: November 2026  
**Application**: WealthOvers Personal Finance  
**Precision Engine**: `Decimal.js` (28-digit precision, `ROUND_HALF_UP`)  
**Database Column Type**: PostgreSQL `NUMERIC(15, 4)`

---

## 1. Mathematical Precision Principles

All financial balances, inflows, outflows, valuations, interest rates, and loan components in WealthOvers adhere strictly to fixed-point decimal arithmetic.

Standard IEEE 754 floating-point operations (`0.1 + 0.2 = 0.30000000000000004`) are strictly forbidden in client and server business logic. All arithmetic passes through `lib/calculations/financial.ts` using `Decimal.js`:

```typescript
import Decimal from "decimal.js";
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
```

---

## 2. Core Financial Formulas

### 2.1 Consolidated Net Worth
The true Net Worth represents the total economic value owned by an individual minus all outstanding liabilities.

$$\text{Net Worth} = \text{Total Assets} - \text{Total Liabilities}$$

Where:
$$\text{Total Assets} = \sum \text{Liquid Accounts} + \sum \text{Investment Valuations} + \sum \text{Tangible Assets}$$
$$\text{Total Liabilities} = \sum \text{Credit Card Balances} + \sum \text{Outstanding Loans} + \sum \text{Manual Liabilities}$$

- **Liquid Net Worth**: $\sum \text{Liquid Accounts} - \sum \text{Credit Card Balances}$
- **Invested Net Worth**: $\sum \text{Investment Holdings Valuations}$
- **Tangible Net Worth**: $\sum \text{Tangible Physical Assets} - \sum \text{Loans \& Mortgages}$

### 2.2 Savings Rate Percentage
Savings rate measures the proportion of disposable income preserved during a specified calendar period:

$$\text{Net Savings} = \text{Total Inflow} - \text{Total Outflow}$$

$$\text{Savings Rate (\%)} = \begin{cases} 
\left(\frac{\text{Net Savings}}{\text{Total Inflow}}\right) \times 100, & \text{if } \text{Total Inflow} > 0 \\
0.00\%, & \text{if } \text{Total Inflow} \le 0 
\end{cases}$$

- *Format Rule*: Always formatted as a 2-decimal percentage (e.g. `40.00%`).
- *Cap Rule*: Capped visually between `-100.00%` and `100.00%` on dashboards.

### 2.3 Financial Health Score (Deterministic Engine)
Rather than an arbitrary AI score, WealthOvers computes a transparent 100-point Financial Health Score based on 4 weighted financial pillars:

| Pillar | Metric | Scoring Criteria (25 pts max each) | Target Ideal |
| :--- | :--- | :--- | :--- |
| **1. Emergency Liquidity** | Months of Runway ($\frac{\text{Liquid Capital}}{\text{Monthly Expenses}}$) | $\ge 6$ mos: 25 pts<br>$3-6$ mos: 18 pts<br>$1-3$ mos: 10 pts<br>$< 1$ mo: 3 pts | $\ge 6$ months |
| **2. Debt-to-Asset Ratio** | $\frac{\text{Total Liabilities}}{\text{Total Assets}} \times 100$ | $< 20\%$: 25 pts<br>$20-40\%$: 20 pts<br>$40-60\%$: 12 pts<br>$> 60\%$: 4 pts | $< 30\%$ |
| **3. Savings Discipline** | Current Month Savings Rate | $\ge 30\%$: 25 pts<br>$20-30\%$: 20 pts<br>$10-20\%$: 14 pts<br>$< 10\%$: 5 pts | $\ge 25\%$ |
| **4. Credit Card Utilization** | $\frac{\text{Credit Used}}{\text{Total Credit Limit}} \times 100$ | $< 10\%$: 25 pts<br>$10-30\%$: 20 pts<br>$30-50\%$: 10 pts<br>$> 50\%$: 2 pts | $< 30\%$ |

$$\text{Financial Health Score} = \sum_{i=1}^4 \text{Pillar Score}_i \quad (\text{Range: } 0 - 100)$$

- **Excellent**: 85 – 100
- **Good**: 70 – 84
- **Fair**: 50 – 69
- **Needs Attention**: < 50

### 2.4 Double-Entry Inter-Account Transfers
- **Rule**: Internal transfers between user accounts (e.g. Savings to Checking, or Checking to Credit Card Settlement) are **cash-flow neutral**.
- **Execution**: The database transaction debits the source account and credits the destination account simultaneously.
- **Reporting Invariant**: `transaction_type = 'transfer'` is strictly excluded from `monthly_inflow` and `monthly_outflow`. Transfers never alter the user's Net Worth or Income/Expense figures.

### 2.5 Refund Processing
- `transaction_type = 'refund'` is credited to the associated account and counted as a positive adjustment offsetting expenses or added to monthly inflow, without duplicating original purchases.

---

## 3. Investment & Portfolio Calculations

### 3.1 Holding Valuation & Unrealized P&L
For each holding $k$:
$$\text{Invested Amount}_k = \text{Quantity}_k \times \text{Average Buy Price}_k$$
$$\text{Current Valuation}_k = \text{Quantity}_k \times \text{Current Market Price}_k$$
$$\text{Unrealized P\&L}_k = \text{Current Valuation}_k - \text{Invested Amount}_k$$
$$\text{Absolute Return (\%)}_k = \begin{cases}
\left(\frac{\text{Unrealized P\&L}_k}{\text{Invested Amount}_k}\right) \times 100, & \text{if } \text{Invested Amount}_k > 0 \\
0.00\%, & \text{otherwise}
\end{cases}$$

### 3.2 XIRR (Extended Internal Rate of Return)
For investments with irregular cash flows (SIPs, dividends, partial sell-offs), XIRR solves for the annual discount rate $r$ such that the Net Present Value (NPV) equals zero:

$$\sum_{j=1}^{N} \frac{C_j}{(1 + r)^{\frac{d_j - d_1}{365}}} = 0$$

Where $C_j$ is the cash flow on date $d_j$ (negative for purchases, positive for sales/dividends, and the final positive cash flow is the current market valuation).

---

## 4. Debt & Loan Amortization Schedule

For a loan with Principal $P$, annual interest rate $R$ (monthly rate $r = \frac{R}{12 \times 100}$), and tenure of $N$ months:

$$\text{Monthly EMI} = P \times \frac{r(1 + r)^N}{(1 + r)^N - 1}$$

For each month $m \in [1, N]$:
$$\text{Interest Component}_m = \text{Balance}_{m-1} \times r$$
$$\text{Principal Component}_m = \text{EMI} - \text{Interest Component}_m$$
$$\text{Remaining Balance}_m = \text{Balance}_{m-1} - \text{Principal Component}_m$$

---

## 5. Indian Financial Year (FY) Date Alignment
- **Indian Financial Year**: Runs from **April 1** of Year $T$ to **March 31** of Year $T+1$ (e.g. FY 2026-27 is `2026-04-01` to `2027-03-31`).
- All tax reports and annual financial summaries provide a dedicated "Indian FY" selector alongside standard calendar year (Jan 1 – Dec 31).

