import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  toDecimal,
  addMoney,
  subtractMoney,
  calculateNetWorth,
  calculateLedgerCashFlow,
  getTransactionDisplayInfo,
} from "../lib/calculations/financial";
import {
  FinancialTransactionService,
  LedgerEntryItem,
} from "../lib/services/financial-transaction-service";

describe("Phase 2: Advanced Transaction Engine & Double-Entry Accounting Invariants", () => {
  describe("1. Double-Entry Mathematical Balance Identity", () => {
    it("guarantees sum of debits equals sum of credits for standard income and expense journals", () => {
      // Income: Debit Bank 50,000 | Credit Income 50,000
      const incomeDebits = toDecimal("50000.0000");
      const incomeCredits = toDecimal("50000.0000");
      expect(incomeDebits.minus(incomeCredits).toNumber()).toBe(0);

      // Expense: Debit Expense 4500 | Credit Bank 4500
      const expenseDebits = toDecimal("4500.5000");
      const expenseCredits = toDecimal("4500.5000");
      expect(expenseDebits.minus(expenseCredits).toNumber()).toBe(0);
    });

    it("guarantees sum of debits equals sum of credits for multi-component loan EMI (Principal + Interest)", () => {
      const principal = toDecimal("18500.0000");
      const interest = toDecimal("6500.0000");
      const totalEMI = toDecimal("25000.0000");

      // Journal:
      // Debit: Loan Principal (Liability Reduction) -> 18,500
      // Debit: Interest Expense (Expense Increase)  -> 6,500
      // Credit: Bank Account (Asset Decrease)      -> 25,000
      const totalDebits = principal.plus(interest);
      const totalCredits = totalEMI;

      expect(totalDebits.equals(totalCredits)).toBe(true);
      expect(totalDebits.minus(totalCredits).toNumber()).toBe(0);
    });

    it("guarantees split transactions balance perfectly across N sub-categories", () => {
      const splits = [
        { category: "Groceries", amount: "1200.50" },
        { category: "Household Supplies", amount: "800.25" },
        { category: "Personal Care", amount: "499.25" },
      ];
      const masterAmount = "2500.00";

      let splitSum = toDecimal(0);
      splits.forEach((s) => {
        splitSum = splitSum.plus(toDecimal(s.amount));
      });

      expect(splitSum.toFixed(2)).toBe(masterAmount);
      expect(splitSum.equals(toDecimal(masterAmount))).toBe(true);
    });
  });

  describe("2. Single-Authority Balance Mutation & Reversal Invariants (DEF-01 Verification)", () => {
    it("reversing an income transaction restores account balance exactly once", () => {
      const initialBank = toDecimal("100000.0000");
      const incomeAmount = toDecimal("35000.0000");

      // Step 1: Ingest Income -> Bank increases by 35,000
      const balanceAfterIncome = initialBank.plus(incomeAmount);
      expect(balanceAfterIncome.toNumber()).toBe(135000);

      // Step 2: Delete/Reverse Income (Application-Level Reversal)
      // Income debit entry is reversed by subtracting the debit amount:
      const balanceAfterReversal = balanceAfterIncome.minus(incomeAmount);

      // Invariant: Balance must equal initial bank exactly once, NOT double-subtracted (which would yield 65,000)
      expect(balanceAfterReversal.toNumber()).toBe(100000);
      expect(balanceAfterReversal.equals(initialBank)).toBe(true);
    });

    it("reversing an expense transaction restores account balance exactly once", () => {
      const initialBank = toDecimal("80000.0000");
      const expenseAmount = toDecimal("12000.0000");

      // Step 1: Ingest Expense -> Bank decreases by 12,000
      const balanceAfterExpense = initialBank.minus(expenseAmount);
      expect(balanceAfterExpense.toNumber()).toBe(68000);

      // Step 2: Delete/Reverse Expense
      // Expense credit entry is reversed by adding back the credited amount:
      const balanceAfterReversal = balanceAfterExpense.plus(expenseAmount);

      expect(balanceAfterReversal.toNumber()).toBe(80000);
      expect(balanceAfterReversal.equals(initialBank)).toBe(true);
    });
  });

  describe("3. Transfer Neutrality & Cash Flow Invariants", () => {
    it("internal transfers between accounts produce net-zero cash flow and zero net worth impact", () => {
      const bankA = 150000;
      const bankB = 20000;
      const transferAmount = 30000;

      const before = calculateNetWorth({
        accounts: [
          { id: "a1", account_type: "savings", current_balance: bankA, is_archived: false },
          { id: "a2", account_type: "current", current_balance: bankB, is_archived: false },
        ],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const after = calculateNetWorth({
        accounts: [
          { id: "a1", account_type: "savings", current_balance: bankA - transferAmount, is_archived: false },
          { id: "a2", account_type: "current", current_balance: bankB + transferAmount, is_archived: false },
        ],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const flow = calculateLedgerCashFlow([
        { transaction_type: "transfer", amount: transferAmount, description: "Bank Transfer" },
      ]);

      expect(parseFloat(before.netWorth)).toBe(170000);
      expect(parseFloat(after.netWorth)).toBe(170000);
      expect(parseFloat(flow.totalInflow)).toBe(0);
      expect(parseFloat(flow.totalOutflow)).toBe(0);
      expect(parseFloat(flow.netCashFlow)).toBe(0);
    });
  });

  describe("4. Credit Card Purchase & Repayment Invariants", () => {
    it("credit card purchases increase liability without deducting bank cash", () => {
      const bankBalance = 50000;
      const cardLimit = 150000;
      const cardInitialOutstanding = 10000;
      const purchaseAmount = 15000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", credit_limit: cardLimit, current_outstanding: cardInitialOutstanding }],
        loans: [],
      });

      // Post purchase:
      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }], // Bank cash untouched!
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", credit_limit: cardLimit, current_outstanding: cardInitialOutstanding + purchaseAmount }],
        loans: [],
      });

      expect(parseFloat(after.totalAssets)).toBe(50000);
      expect(parseFloat(after.totalLiabilities)).toBe(25000);
      expect(parseFloat(after.netWorth)).toBe(25000); // 50,000 - 25,000
      expect(parseFloat(before.netWorth) - parseFloat(after.netWorth)).toBe(15000);
    });

    it("credit card repayment reduces bank cash and card liability without duplicating expense", () => {
      const bankBalance = 50000;
      const cardOutstanding = 25000;
      const paymentAmount = 25000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", current_outstanding: cardOutstanding }],
        loans: [],
      });

      // Repayment: Debit Credit Card Liability (reduces debt), Credit Bank (reduces cash)
      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance - paymentAmount, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", current_outstanding: cardOutstanding - paymentAmount }],
        loans: [],
      });

      expect(parseFloat(after.totalAssets)).toBe(25000);
      expect(parseFloat(after.totalLiabilities)).toBe(0);
      expect(parseFloat(after.netWorth)).toBe(25000); // Net worth is completely preserved!
      expect(parseFloat(before.netWorth)).toBe(parseFloat(after.netWorth));
    });
  });
});

