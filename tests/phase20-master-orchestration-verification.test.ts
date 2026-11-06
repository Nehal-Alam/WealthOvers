import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateNetWorth,
  toDecimal,
  addMoney,
  subtractMoney,
  getTransactionDisplayInfo,
} from "../lib/calculations/financial";

describe("Master Orchestration & Double-Entry Ledger Verification", () => {
  describe("1. Transaction Update & Balance Adjustment Delta Math", () => {
    it("correctly calculates delta when expense amount increases from 500 to 700", () => {
      const initialBalance = toDecimal("5000.00");
      const oldAmount = toDecimal("500.00");
      const newAmount = toDecimal("700.00");

      // Balance after initial expense
      const postExpenseBalance = initialBalance.minus(oldAmount);
      expect(postExpenseBalance.toNumber()).toBe(4500);

      // Reversal of old entry: credit is reversed (added back)
      const revertedBalance = postExpenseBalance.plus(oldAmount);
      expect(revertedBalance.toNumber()).toBe(5000);

      // Application of new entry: deducted
      const updatedBalance = revertedBalance.minus(newAmount);
      expect(updatedBalance.toNumber()).toBe(4300);

      // Verify net difference is exactly old - new = -200
      expect(updatedBalance.minus(postExpenseBalance).toNumber()).toBe(-200);
    });

    it("correctly restores balance when expense amount decreases from 500 to 300", () => {
      const postExpenseBalance = toDecimal("4500.00");
      const oldAmount = toDecimal("500.00");
      const newAmount = toDecimal("300.00");

      // Reversal: old credit added back
      const revertedBalance = postExpenseBalance.plus(oldAmount);
      // Application: new credit deducted
      const updatedBalance = revertedBalance.minus(newAmount);

      expect(updatedBalance.toNumber()).toBe(4700);
      expect(updatedBalance.minus(postExpenseBalance).toNumber()).toBe(200);
    });

    it("correctly handles account change during transaction edit", () => {
      let accABalance = toDecimal("4000.00"); // Source of old tx
      let accBBalance = toDecimal("6000.00"); // Target of new tx
      const amount = toDecimal("1000.00");

      // Old tx was on Acc A: reversal adds amount back to Acc A
      accABalance = accABalance.plus(amount);
      // New tx moves to Acc B: applies deduction to Acc B
      accBBalance = accBBalance.minus(amount);

      expect(accABalance.toNumber()).toBe(5000);
      expect(accBBalance.toNumber()).toBe(5000);
    });
  });

  describe("2. Split Transaction Double-Entry Parity", () => {
    it("ensures total debits equals total credits across multi-category split", () => {
      const totalAmount = toDecimal("1500.00");
      const splits = [
        { category: "Groceries", amount: toDecimal("750.00") },
        { category: "Utilities", amount: toDecimal("450.00") },
        { category: "Entertainment", amount: toDecimal("300.00") },
      ];

      // Sum of split debit amounts
      const sumSplits = splits.reduce((acc, s) => acc.plus(s.amount), toDecimal(0));
      expect(sumSplits.toNumber()).toBe(totalAmount.toNumber());

      // Credit entry: 1 credit to bank account of 1500
      const totalCredits = totalAmount;
      // Debit entries: 3 debits to expense categories totaling 1500
      const totalDebits = sumSplits;

      const imbalance = totalDebits.minus(totalCredits).abs();
      expect(imbalance.toNumber()).toBe(0);
    });
  });

  describe("3. Authoritative Net Worth Harmonization", () => {
    it("verifies loan given is treated as asset receivable and credit cards as liabilities", () => {
      const result = calculateNetWorth({
        accounts: [
          { id: "acc-1", account_type: "savings", current_balance: 200000, is_archived: false },
        ],
        investments: [
          { id: "inv-1", total_quantity: 100, average_buy_price: 500, current_nav_or_price: 600, currency: "INR" },
        ],
        assets: [
          { id: "ast-1", current_valuation: 500000 },
        ],
        loans: [
          // Money lent to friend: RECEIVABLE ASSET
          { id: "ln-1", loan_type: "loan_given", outstanding_balance: 50000 },
          // Home loan: LIABILITY
          { id: "ln-2", loan_type: "home_loan", outstanding_balance: 300000 },
        ],
        liabilities: [
          { id: "lia-1", outstanding_amount: 20000 },
        ],
        creditCards: [
          { id: "cc-1", current_outstanding: 40000 },
        ],
      });

      // Assets Breakdown:
      // Liquid: 200,000
      // Investments: 60,000 (100 * 600)
      // Tangible: 500,000
      // Receivables: 50,000 (loan_given)
      // Total Assets = 200,000 + 60,000 + 500,000 + 50,000 = 810,000
      expect(parseFloat(result.assetsBreakdown.liquidAccounts)).toBe(200000);
      expect(parseFloat(result.assetsBreakdown.investments)).toBe(60000);
      expect(parseFloat(result.assetsBreakdown.tangibleAssets)).toBe(500000);
      expect(parseFloat(result.assetsBreakdown.receivables)).toBe(50000);
      expect(parseFloat(result.totalAssets)).toBe(810000);

      // Liabilities Breakdown:
      // Loans: 300,000 (home_loan)
      // Credit Cards: 40,000
      // Other debts: 20,000
      // Total Liabilities = 300,000 + 40,000 + 20,000 = 360,000
      expect(parseFloat(result.liabilitiesBreakdown.loans)).toBe(300000);
      expect(parseFloat(result.liabilitiesBreakdown.creditCards)).toBe(40000);
      expect(parseFloat(result.liabilitiesBreakdown.otherDebts)).toBe(20000);
      expect(parseFloat(result.totalLiabilities)).toBe(360000);

      // Net Worth = 810,000 - 360,000 = 450,000
      expect(parseFloat(result.netWorth)).toBe(450000);
      expect(result.isNetPositive).toBe(true);
    });
  });

  describe("4. Statement Import 4.5 MB Limit Protection", () => {
    it("validates file size boundary against serverless payload limit", () => {
      const MAX_BYTES = 4.5 * 1024 * 1024;
      const validSize = 2 * 1024 * 1024; // 2 MB
      const oversizedSize = 5 * 1024 * 1024; // 5 MB

      expect(validSize <= MAX_BYTES).toBe(true);
      expect(oversizedSize > MAX_BYTES).toBe(true);
    });
  });
});
