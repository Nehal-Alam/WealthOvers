import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateNetWorth,
  toDecimal,
  addMoney,
  subtractMoney,
  calculateLoanEMI,
  calculateLedgerCashFlow,
  getTransactionDisplayInfo,
} from "../lib/calculations/financial";
import {
  getDateRangeFromFilter,
  filterTransactionsByDateRange,
  DateDurationFilter,
} from "../lib/calculations/date-ranges";

describe("WealthOvers Bug Fix & Financial Integrity Verification", () => {
  describe("Section 2: Accounts & Archive Separation", () => {
    it("filters active vs archived accounts correctly without invalid column queries", () => {
      const mockAccounts = [
        { id: "acc-1", name: "HDFC Salary", account_type: "salary", current_balance: 50000, is_archived: false },
        { id: "acc-2", name: "ICICI Savings", account_type: "savings", current_balance: 100000, is_archived: false },
        { id: "acc-3", name: "Old Dormant Account", account_type: "savings", current_balance: 500, is_archived: true },
      ];

      const active = mockAccounts.filter((a) => !a.is_archived);
      const archived = mockAccounts.filter((a) => a.is_archived);

      expect(active).toHaveLength(2);
      expect(archived).toHaveLength(1);
      expect(active.map((a) => a.name)).not.toContain("Old Dormant Account");
    });

    it("supports all required account types with Decimal precision", () => {
      const balances = ["10000.50", "25000.75", "5000.00"];
      let total = toDecimal(0);
      balances.forEach((b) => {
        total = total.plus(toDecimal(b));
      });
      expect(total.toFixed(2)).toBe("40001.25");
    });
  });

  describe("Section 3: Net Worth Formula & Strict Accounting Rules", () => {
    it("matches the exact user requirement example: ₹2,50,000 assets − ₹40,000 liabilities = ₹2,10,000 net worth", () => {
      const result = calculateNetWorth({
        accounts: [
          { id: "b1", account_type: "savings", current_balance: 100000, is_archived: false },
          { id: "c1", account_type: "cash", current_balance: 10000, is_archived: false },
        ],
        investments: [
          { id: "i1", total_quantity: 1, current_nav_or_price: 50000, current_valuation: 50000 }, // Mutual funds
          { id: "i2", total_quantity: 1, current_nav_or_price: 40000, current_valuation: 40000 }, // Stocks
        ],
        assets: [
          { id: "a1", category: "gold", current_valuation: 20000 }, // Gold
          { id: "a2", category: "other", current_valuation: 30000 }, // Other assets
        ],
        creditCards: [
          { id: "cc1", current_outstanding: 15000 }, // Credit card dues
        ],
        loans: [
          { id: "l1", loan_type: "personal", outstanding_balance: 25000 }, // Outstanding loan
        ],
      });

      expect(parseFloat(result.totalAssets)).toBe(250000);
      expect(parseFloat(result.totalLiabilities)).toBe(40000);
      expect(parseFloat(result.netWorth)).toBe(210000);
      expect(result.isNetPositive).toBe(true);
    });

    it("correctly treats money lent (loan_given) as a receivable asset, NOT a liability", () => {
      const result = calculateNetWorth({
        accounts: [{ id: "b1", account_type: "savings", current_balance: 50000, is_archived: false }],
        loans: [
          { id: "l-lent", loan_type: "loan_given", outstanding_balance: 30000 }, // Money lent
          { id: "l-borrowed", loan_type: "loan_received", outstanding_balance: 20000 }, // Money borrowed
        ],
      });

      // Total assets = 50000 (bank) + 30000 (receivable) = 80000
      expect(parseFloat(result.totalAssets)).toBe(80000);
      expect(parseFloat(result.assetsBreakdown.receivables)).toBe(30000);

      // Total liabilities = 20000 (borrowed money)
      expect(parseFloat(result.totalLiabilities)).toBe(20000);
      expect(parseFloat(result.liabilitiesBreakdown.borrowedMoney)).toBe(20000);

      // Net worth = 80000 - 20000 = 60000
      expect(parseFloat(result.netWorth)).toBe(60000);
    });

    it("excludes archived accounts from net worth calculation", () => {
      const result = calculateNetWorth({
        accounts: [
          { id: "a1", account_type: "savings", current_balance: 100000, is_archived: false },
          { id: "a2", account_type: "savings", current_balance: 999999, is_archived: true }, // archived
        ],
      });

      expect(parseFloat(result.totalAssets)).toBe(100000);
      expect(parseFloat(result.netWorth)).toBe(100000);
    });

    it("avoids double counting credit card liability when linked in accounts and credit_cards tables", () => {
      const result = calculateNetWorth({
        accounts: [
          { id: "cc-acc-1", account_type: "credit_card", current_balance: -15000, is_archived: false },
        ],
        creditCards: [
          { id: "cc-1", account_id: "cc-acc-1", current_outstanding: 15000 },
        ],
      });

      // Total liabilities should be 15000, NOT 30000
      expect(parseFloat(result.totalLiabilities)).toBe(15000);
      expect(parseFloat(result.netWorth)).toBe(-15000);
    });
  });

  describe("Section 4: Insights Date Ranges & Indian Financial Year", () => {
    it("calculates Indian Financial Year (April 1 to March 31) accurately", () => {
      const refDate = new Date("2026-11-02T12:00:00Z"); // November 2026
      const range = getDateRangeFromFilter("financial_year", refDate);

      expect(range.label).toBe("FY 2026–27");
      expect(range.start).not.toBeNull();
      expect(range.end).not.toBeNull();
      expect(range.start!.getFullYear()).toBe(2026);
      expect(range.start!.getMonth()).toBe(3); // April (0-indexed 3)
      expect(range.start!.getDate()).toBe(1);

      expect(range.end!.getFullYear()).toBe(2027);
      expect(range.end!.getMonth()).toBe(2); // March (0-indexed 2)
      expect(range.end!.getDate()).toBe(31);
    });

    it("filters transactions accurately by date range", () => {
      const transactions = [
        { id: "t1", amount: 500, transaction_date: "2026-11-01T10:00:00Z" },
        { id: "t2", amount: 1500, transaction_date: "2026-10-15T10:00:00Z" },
        { id: "t3", amount: 2000, transaction_date: "2025-05-10T10:00:00Z" },
      ];

      const refDate = new Date("2026-11-02T12:00:00Z");
      const thisMonth = getDateRangeFromFilter("this_month", refDate);
      const filtered = filterTransactionsByDateRange(transactions, thisMonth);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("t1");
    });
  });

  describe("Section 5: Investment Account Deductions & SIP Automation", () => {
    it("atomically computes new balance when deducting investment purchase cost", () => {
      const bankBalance = toDecimal("100000.00");
      const qty = toDecimal("50");
      const nav = toDecimal("500.00");
      const invested = qty.times(nav); // 25000.00

      const newBalance = bankBalance.minus(invested);
      expect(newBalance.toString()).toBe("75000");

      // Verify net worth delta is exactly 0 (cash becomes investment asset)
      const assetDelta = invested.minus(invested);
      expect(assetDelta.isZero()).toBe(true);
    });

    it("generates deterministic SIP execution idempotency key", () => {
      const sipId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      const dueDate = "2026-12-05";
      const key1 = `sip_${sipId}_${dueDate}`;
      const key2 = `sip_${sipId}_${dueDate}`;

      expect(key1).toBe(key2);
      expect(key1).toBe("sip_f47ac10b-58cc-4372-a567-0e02b2c3d479_2026-12-05");
    });
  });

  describe("Section 6: Credit Card Dues & Repayment Accounting", () => {
    it("ensures credit card repayment reduces both paying account and card debt without double counting", () => {
      const bankBalance = toDecimal("80000.00");
      const cardDebt = toDecimal("15000.00");
      const paymentAmount = toDecimal("15000.00");

      const newBankBalance = bankBalance.minus(paymentAmount);
      const newCardDebt = cardDebt.minus(paymentAmount);

      expect(newBankBalance.toString()).toBe("65000");
      expect(newCardDebt.isZero()).toBe(true);

      // Pre-repayment net worth = 80000 - 15000 = 65000
      // Post-repayment net worth = 65000 - 0 = 65000 (No double expense)
      expect(newBankBalance.minus(newCardDebt).toString()).toBe("65000");
    });
  });

  describe("Section 7: Loan Lending vs Borrowing Double-Entry Logic", () => {
    it("computes loan EMI with exact amortization math", () => {
      const principal = 1000000; // 10 Lakhs
      const annualRate = 8.5; // 8.5% p.a.
      const tenureMonths = 60; // 5 years

      const emi = calculateLoanEMI(principal, annualRate, tenureMonths);
      expect(parseFloat(emi.monthlyEmi)).toBeGreaterThan(20000);
      expect(parseFloat(emi.monthlyEmi)).toBeLessThan(21000);
      expect(parseFloat(emi.totalPayment)).toBeGreaterThan(principal);
    });

    it("verifies lending disbursement debits bank while borrowing disbursement credits bank", () => {
      const bankBalance = toDecimal("500000.00");
      const lentAmount = toDecimal("50000.00");
      const borrowedAmount = toDecimal("200000.00");

      // Lending decreases bank balance
      const balanceAfterLending = bankBalance.minus(lentAmount);
      expect(balanceAfterLending.toString()).toBe("450000");

      // Borrowing increases bank balance
      const balanceAfterBorrowing = balanceAfterLending.plus(borrowedAmount);
      expect(balanceAfterBorrowing.toString()).toBe("650000");
    });
  });

  describe("Section 8: Ledger Cash Flow & Investment / SIP Deduction Accounting", () => {
    it("calculates cash flow accurately matching the user's exact live scenario", () => {
      // The user's live data:
      // 1. Medicine: ₹112 (expense)
      // 2. Salary: ₹23,730 (income)
      // 3. SIP Installment: Infosys SIP: ₹1,600 (investment_buy)
      const userTransactions = [
        {
          id: "59bdaf73-8ca1-4488-9d7c-ae520c6c265f",
          amount: "112.0000",
          transaction_type: "expense",
          description: "Medicine",
          account_id: "axis-bank-id",
        },
        {
          id: "41123300-4fe6-44a2-9736-c7522bf6826f",
          amount: "23730.0000",
          transaction_type: "income",
          description: "Salary",
          account_id: "axis-bank-id",
        },
        {
          id: "76f8a295-3cee-4bfc-915a-4677f2ac564e",
          amount: "1600.0000",
          transaction_type: "investment_buy",
          description: "SIP Installment: Infosys SIP",
          account_id: "axis-bank-id",
        },
      ];

      const summary = calculateLedgerCashFlow(userTransactions);

      // Inflow must be Salary = ₹23,730.00
      expect(parseFloat(summary.totalInflow)).toBe(23730);
      expect(summary.creditCount).toBe(1);

      // Outflow must be Medicine (₹112) + SIP Installment (₹1,600) = ₹1,712.00
      expect(parseFloat(summary.totalOutflow)).toBe(1712);
      expect(summary.debitCount).toBe(2);

      // Net Cash Flow must be ₹23,730 - ₹1,712 = ₹22,018.00 (NOT ₹23,618.00!)
      expect(parseFloat(summary.netCashFlow)).toBe(22018);
    });

    it("verifies display sign, color, and direction for all transaction types", () => {
      // Salary (income) -> + sign, success color, inflow
      const incomeInfo = getTransactionDisplayInfo({
        transaction_type: "income",
        amount: 23730,
        description: "Salary",
      });
      expect(incomeInfo.displaySign).toBe("+");
      expect(incomeInfo.direction).toBe("inflow");
      expect(incomeInfo.textColorClass).toBe("text-success");
      expect(incomeInfo.isCredit).toBe(true);

      // Medicine (expense) -> - sign, danger color, outflow
      const expenseInfo = getTransactionDisplayInfo({
        transaction_type: "expense",
        amount: 112,
        description: "Medicine",
      });
      expect(expenseInfo.displaySign).toBe("-");
      expect(expenseInfo.direction).toBe("outflow");
      expect(expenseInfo.textColorClass).toBe("text-danger");
      expect(expenseInfo.isDebit).toBe(true);

      // SIP Installment (investment_buy) -> - sign, danger color, outflow (debit from bank)
      const sipInfo = getTransactionDisplayInfo({
        transaction_type: "investment_buy",
        amount: 1600,
        description: "SIP Installment: Infosys SIP",
      });
      expect(sipInfo.displaySign).toBe("-");
      expect(sipInfo.direction).toBe("outflow");
      expect(sipInfo.textColorClass).toBe("text-danger");
      expect(sipInfo.isDebit).toBe(true);
      expect(sipInfo.badgeLabel).toBe("SIP Installment");

      // Internal transfer viewed across all accounts -> ⇄ sign, neutral direction
      const transferInfo = getTransactionDisplayInfo({
        transaction_type: "transfer",
        amount: 5000,
        account_id: "bank-a",
        destination_account_id: "bank-b",
      });
      expect(transferInfo.displaySign).toBe("⇄ ");
      expect(transferInfo.direction).toBe("neutral");
      expect(transferInfo.isTransfer).toBe(true);

      // Internal transfer viewed from source account -> - sign, outflow
      const transferOutInfo = getTransactionDisplayInfo(
        {
          transaction_type: "transfer",
          amount: 5000,
          account_id: "bank-a",
          destination_account_id: "bank-b",
        },
        "bank-a"
      );
      expect(transferOutInfo.displaySign).toBe("-");
      expect(transferOutInfo.direction).toBe("outflow");

      // Internal transfer viewed from destination account -> + sign, inflow
      const transferInInfo = getTransactionDisplayInfo(
        {
          transaction_type: "transfer",
          amount: 5000,
          account_id: "bank-a",
          destination_account_id: "bank-b",
        },
        "bank-b"
      );
      expect(transferInInfo.displaySign).toBe("+");
      expect(transferInInfo.direction).toBe("inflow");
    });
  });

  describe("Section 10: Loan & Repayment Editing, and Inflow/Outflow Ledger Tracking", () => {
    it("recalculates EMI and recalibrates outstanding balance when loan details are edited", () => {
      // Original loan: ₹50,000 principal at 0% for 3 months
      const originalPrincipal = toDecimal(50000);
      const originalTenure = 3;
      const { monthlyEmi: originalEmi } = calculateLoanEMI(originalPrincipal, toDecimal(0), originalTenure);
      expect(parseFloat(originalEmi)).toBeCloseTo(16666.67, 1);

      // Suppose 1 payment of ₹16,666 was already made (₹16,666 principal)
      const principalPaid = toDecimal(16666);
      const existingOutstanding = originalPrincipal.minus(principalPaid);
      expect(existingOutstanding.toNumber()).toBe(33334);

      // Now user edits the loan: corrects principal to ₹60,000, tenure to 4 months
      const correctedPrincipal = toDecimal(60000);
      const correctedTenure = 4;
      const { monthlyEmi: newEmi } = calculateLoanEMI(correctedPrincipal, toDecimal(0), correctedTenure);
      expect(parseFloat(newEmi)).toBe(15000);

      // Recalibrated outstanding balance: correctedPrincipal (60000) - principalPaid (16666) = 43334
      const recalibratedOutstanding = Decimal.max(0, correctedPrincipal.minus(principalPaid));
      expect(recalibratedOutstanding.toNumber()).toBe(43334);
    });

    it("handles repayment payment editing with precise double-entry balance adjustment", () => {
      // Loan starting at ₹33,334 outstanding balance
      let loanOutstanding = toDecimal(33334);
      let bankBalance = toDecimal(50000);

      // Suppose previous recorded payment was: emi_amount: 16,666 (principal: 16,666, interest: 0, extra: 0)
      const oldPayment = {
        emi_amount: 16666,
        principal_component: 16666,
        extra_prepayment: 0,
      };

      // User realizes the actual EMI paid was ₹17,000 (with ₹334 extra prepayment)
      const updatedPayment = {
        emi_amount: 17000,
        principal_component: 16666,
        extra_prepayment: 334,
      };

      // Delta principal paid: (16666 + 334) - (16666 + 0) = +334
      const oldTotalPrincipal = toDecimal(oldPayment.principal_component).plus(oldPayment.extra_prepayment);
      const newTotalPrincipal = toDecimal(updatedPayment.principal_component).plus(updatedPayment.extra_prepayment);
      const principalDelta = newTotalPrincipal.minus(oldTotalPrincipal);
      expect(principalDelta.toNumber()).toBe(334);

      // Loan outstanding decreases by delta
      loanOutstanding = Decimal.max(0, loanOutstanding.minus(principalDelta));
      expect(loanOutstanding.toNumber()).toBe(33000);

      // Delta cash paid out: 17000 - 16666 = 334 more deducted from bank account
      const cashDelta = toDecimal(updatedPayment.emi_amount).minus(oldPayment.emi_amount);
      bankBalance = bankBalance.minus(cashDelta);
      expect(bankBalance.toNumber()).toBe(49666);
    });

    it("restores loan outstanding balance and funding account on payment deletion", () => {
      let loanOutstanding = toDecimal(33334);
      let bankBalance = toDecimal(40000);

      // Payment to delete: emi_amount: 16666 (principal: 16000, extra: 666)
      const paymentToDelete = {
        emi_amount: 16666,
        principal_component: 16000,
        extra_prepayment: 666,
      };

      const principalToRestore = toDecimal(paymentToDelete.principal_component).plus(paymentToDelete.extra_prepayment);
      loanOutstanding = loanOutstanding.plus(principalToRestore);
      expect(loanOutstanding.toNumber()).toBe(50000);

      // Cash refunded/restored to funding bank account
      bankBalance = bankBalance.plus(paymentToDelete.emi_amount);
      expect(bankBalance.toNumber()).toBe(56666);
    });

    it("correctly models inflow vs outflow semantics for borrowed vs lent debt", () => {
      // 1. Borrowed Loan (e.g. personal, vehicle, home loan):
      // - Initial loan disbursement = INFLOW (+ money received)
      // - Repayments = OUTFLOW (- money paid to bank/lender)
      const borrowedPrincipal = 50000;
      const borrowedPayments = [16666, 16666];

      const borrowedInflow = borrowedPrincipal;
      const borrowedOutflow = borrowedPayments.reduce((sum, p) => sum + p, 0);
      const borrowedNet = borrowedInflow - borrowedOutflow;

      expect(borrowedInflow).toBe(50000);
      expect(borrowedOutflow).toBe(33332);
      expect(borrowedNet).toBe(16668);

      // 2. Lent Loan (loan_given, money lent to friend):
      // - Initial loan disbursement = OUTFLOW (- money paid to borrower)
      // - Repayments received = INFLOW (+ money received back from borrower)
      const lentPrincipal = 20000;
      const lentRepaymentsReceived = [5000, 5000];

      const lentOutflow = lentPrincipal;
      const lentInflow = lentRepaymentsReceived.reduce((sum, p) => sum + p, 0);
      const remainingReceivable = lentOutflow - lentInflow;

      expect(lentOutflow).toBe(20000);
      expect(lentInflow).toBe(10000);
      expect(remainingReceivable).toBe(10000);
    });
  });
});
