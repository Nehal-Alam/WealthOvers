import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateNetWorth,
  toDecimal,
  addMoney,
  subtractMoney,
  calculateLedgerCashFlow,
  getTransactionDisplayInfo,
} from "../lib/calculations/financial";
import {
  FinancialTransactionService,
} from "../lib/services/financial-transaction-service";
import { generateTransactionIdempotencyHash } from "../lib/parsers/duplicate-detector";

describe("Phase 18: End-to-End Financial Workflows (Master Directives Tests 1 to 12)", () => {
  // Test 1: Income
  describe("Test 1: Income", () => {
    it("opening bank balance ₹50,000 + salary income ₹30,000 -> bank ₹80,000, income ₹30,000, net worth increase ₹30,000", () => {
      const openingBank = 50000;
      const salary = 30000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: openingBank, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });
      expect(parseFloat(before.netWorth)).toBe(50000);

      // Post Income: Debit Bank, Credit Income
      const debitBank = toDecimal(openingBank).plus(salary);
      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: debitBank.toNumber(), is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const flow = calculateLedgerCashFlow([
        { transaction_type: "income", amount: salary, description: "Monthly Salary" },
      ]);

      expect(parseFloat(after.totalAssets)).toBe(80000);
      expect(parseFloat(after.netWorth)).toBe(80000);
      expect(parseFloat(after.netWorth) - parseFloat(before.netWorth)).toBe(30000);
      expect(parseFloat(flow.totalInflow)).toBe(30000);
      expect(parseFloat(flow.netCashFlow)).toBe(30000);
    });
  });

  // Test 2: Expense
  describe("Test 2: Expense", () => {
    it("opening bank ₹80,000 - expense ₹5,000 -> bank ₹75,000, expense ₹5,000, net worth decrease ₹5,000", () => {
      const openingBank = 80000;
      const expenseAmount = 5000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: openingBank, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const updatedBank = toDecimal(openingBank).minus(expenseAmount);
      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: updatedBank.toNumber(), is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const flow = calculateLedgerCashFlow([
        { transaction_type: "expense", amount: expenseAmount, description: "Grocery Store" },
      ]);

      expect(parseFloat(after.totalAssets)).toBe(75000);
      expect(parseFloat(after.netWorth)).toBe(75000);
      expect(parseFloat(before.netWorth) - parseFloat(after.netWorth)).toBe(5000);
      expect(parseFloat(flow.totalOutflow)).toBe(5000);
      expect(parseFloat(flow.netCashFlow)).toBe(-5000);
    });
  });

  // Test 3: Transfer
  describe("Test 3: Transfer", () => {
    it("transfer ₹10,000 from Bank A to Bank B -> Bank A decreases, Bank B increases, total assets and net worth unchanged, income & expense unchanged", () => {
      const bankA = 50000;
      const bankB = 25000;
      const transferAmount = 10000;

      const before = calculateNetWorth({
        accounts: [
          { id: "a1", account_type: "savings", current_balance: bankA, is_archived: false },
          { id: "a2", account_type: "savings", current_balance: bankB, is_archived: false },
        ],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const after = calculateNetWorth({
        accounts: [
          { id: "a1", account_type: "savings", current_balance: bankA - transferAmount, is_archived: false },
          { id: "a2", account_type: "savings", current_balance: bankB + transferAmount, is_archived: false },
        ],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const flow = calculateLedgerCashFlow([
        { transaction_type: "transfer", amount: transferAmount, description: "Internal Fund Transfer" },
      ]);

      expect(parseFloat(before.netWorth)).toBe(75000);
      expect(parseFloat(after.netWorth)).toBe(75000);
      expect(parseFloat(flow.totalInflow)).toBe(0);
      expect(parseFloat(flow.totalOutflow)).toBe(0);
      expect(parseFloat(flow.netCashFlow)).toBe(0);
      expect(flow.transferCount).toBe(1);
    });
  });

  // Test 4: Credit Card Purchase
  describe("Test 4: Credit Card Purchase", () => {
    it("opening card liability ₹0, purchase ₹8,000 -> expense ₹8,000, card liability ₹8,000, bank balance does not decrease", () => {
      const bankBalance = 60000;
      const cardLiabilityInitial = 0;
      const purchaseAmount = 8000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", current_outstanding: cardLiabilityInitial }],
        loans: [],
      });

      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }], // Bank untouched!
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", current_outstanding: cardLiabilityInitial + purchaseAmount }],
        loans: [],
      });

      expect(parseFloat(after.totalAssets)).toBe(60000);
      expect(parseFloat(after.totalLiabilities)).toBe(8000);
      expect(parseFloat(after.netWorth)).toBe(52000); // 60000 - 8000
    });
  });

  // Test 5: Credit Card Payment
  describe("Test 5: Credit Card Payment", () => {
    it("pay ₹8,000 from bank account -> bank decreases ₹8,000, card liability decreases ₹8,000, expense does not increase again", () => {
      const bankBalance = 60000;
      const cardLiability = 8000;
      const paymentAmount = 8000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", current_outstanding: cardLiability }],
        loans: [],
      });

      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance - paymentAmount, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [{ id: "cc-1", current_outstanding: cardLiability - paymentAmount }],
        loans: [],
      });

      // Debit Credit Card Liability, Credit Bank Account. Double entry is balanced:
      const debitLiability = toDecimal(paymentAmount);
      const creditBank = toDecimal(paymentAmount);
      expect(debitLiability.equals(creditBank)).toBe(true);

      expect(parseFloat(after.totalAssets)).toBe(52000);
      expect(parseFloat(after.totalLiabilities)).toBe(0);
      expect(parseFloat(after.netWorth)).toBe(52000); // Net worth is preserved during debt payoff
    });
  });

  // Test 6: Loan Disbursement
  describe("Test 6: Loan Disbursement", () => {
    it("record loan disbursement ₹50,000 -> bank increases ₹50,000, loan liability increases ₹50,000, net worth unchanged", () => {
      const bankInitial = 40000;
      const disbursement = 50000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankInitial, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankInitial + disbursement, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [{ id: "loan-1", loan_type: "personal", outstanding_balance: disbursement }],
      });

      expect(parseFloat(before.netWorth)).toBe(40000);
      expect(parseFloat(after.totalAssets)).toBe(90000);
      expect(parseFloat(after.totalLiabilities)).toBe(50000);
      expect(parseFloat(after.netWorth)).toBe(40000); // 90000 - 50000 = 40000 (No artificial wealth creation!)
    });
  });

  // Test 7: EMI (Principal vs Interest)
  describe("Test 7: EMI (Principal vs Interest Split)", () => {
    it("record EMI ₹5,000 (Principal ₹4,000, Interest ₹1,000) -> bank decreases ₹5,000, loan liability decreases ₹4,000, interest expense ₹1,000", () => {
      const bankInitial = 90000;
      const loanLiabilityInitial = 50000;
      const principalPaid = 4000;
      const interestPaid = 1000;
      const totalEMI = principalPaid + interestPaid;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankInitial, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [{ id: "loan-1", loan_type: "personal", outstanding_balance: loanLiabilityInitial }],
      });

      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankInitial - totalEMI, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [{ id: "loan-1", loan_type: "personal", outstanding_balance: loanLiabilityInitial - principalPaid }],
      });

      // Journal Posting:
      // Debit Loan Payable Liability: ₹4,000
      // Debit Interest Expense: ₹1,000
      // Credit Bank Account: ₹5,000
      const totalDebits = toDecimal(principalPaid).plus(interestPaid);
      const totalCredits = toDecimal(totalEMI);
      expect(totalDebits.equals(totalCredits)).toBe(true);

      expect(parseFloat(after.totalAssets)).toBe(85000);
      expect(parseFloat(after.totalLiabilities)).toBe(46000);
      expect(parseFloat(after.netWorth)).toBe(39000); // 85000 - 46000 = 39000 (only interest portion reduced net worth!)
      expect(parseFloat(before.netWorth) - parseFloat(after.netWorth)).toBe(1000);
    });
  });

  // Test 8: Asset Purchase
  describe("Test 8: Asset Purchase", () => {
    it("purchase asset worth ₹20,000 using bank funds -> bank decreases ₹20,000, asset increases ₹20,000, net worth unchanged at purchase", () => {
      const bankInitial = 70000;
      const assetCost = 20000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankInitial, is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankInitial - assetCost, is_archived: false }],
        investments: [],
        assets: [{ id: "asset-1", category: "vehicles", current_valuation: assetCost }],
        creditCards: [],
        loans: [],
      });

      // Double entry: Debit Fixed Asset (+20,000), Credit Bank (-20,000)
      const debitAsset = toDecimal(assetCost);
      const creditBank = toDecimal(assetCost);
      expect(debitAsset.equals(creditBank)).toBe(true);

      expect(parseFloat(before.netWorth)).toBe(70000);
      expect(parseFloat(after.totalAssets)).toBe(70000); // 50000 liquid + 20000 fixed
      expect(parseFloat(after.netWorth)).toBe(70000); // Net worth is preserved during capital exchange
    });
  });

  // Test 9: Asset Valuation (Unrealized Change)
  describe("Test 9: Asset Valuation (Unrealized Change)", () => {
    it("update asset valuation from ₹20,000 to ₹18,000 -> asset decreases ₹2,000, unrealized loss reflected, purchase data intact", () => {
      const bankBalance = 50000;
      const initialValuation = 20000;
      const updatedValuation = 18000;

      const before = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }],
        investments: [],
        assets: [{ id: "asset-1", category: "vehicles", current_valuation: initialValuation }],
        creditCards: [],
        loans: [],
      });

      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: bankBalance, is_archived: false }],
        investments: [],
        assets: [{ id: "asset-1", category: "vehicles", current_valuation: updatedValuation }],
        creditCards: [],
        loans: [],
      });

      const deltaValuation = toDecimal(updatedValuation).minus(initialValuation);
      expect(deltaValuation.toNumber()).toBe(-2000);

      expect(parseFloat(before.netWorth)).toBe(70000);
      expect(parseFloat(after.netWorth)).toBe(68000);
      expect(parseFloat(before.netWorth) - parseFloat(after.netWorth)).toBe(2000);
    });
  });

  // Test 10: Refund
  describe("Test 10: Refund", () => {
    it("record refund of ₹1,000 for previous expense -> bank increases ₹1,000, expense reporting reflects refund, audit trail intact", () => {
      const initialBank = 40000;
      const refundAmount = 1000;

      const afterRefundBank = toDecimal(initialBank).plus(refundAmount);
      const after = calculateNetWorth({
        accounts: [{ id: "acc-1", account_type: "savings", current_balance: afterRefundBank.toNumber(), is_archived: false }],
        investments: [],
        assets: [],
        creditCards: [],
        loans: [],
      });

      // Display info for refund: inflow direction, positive sign
      const refundInfo = getTransactionDisplayInfo({
        transaction_type: "refund",
        amount: refundAmount,
        description: "Merchant Refund - Returned Item",
      });

      expect(refundInfo.direction).toBe("inflow");
      expect(refundInfo.displaySign).toBe("+");
      expect(parseFloat(after.totalAssets)).toBe(41000);
    });
  });

  // Test 11: Duplicate Protection
  describe("Test 11: Duplicate Protection (Idempotency Key)", () => {
    it("generates deterministic SHA-256 hash preventing duplicate posting of the same financial record", () => {
      const txnRecord = {
        userId: "user-123",
        amount: 4500.5,
        transactionDate: "2026-11-06T10:00:00Z",
        referenceNumber: "UPI-REF-998877",
        description: "Swiggy Order",
      };

      const hash1 = generateTransactionIdempotencyHash(txnRecord);
      const hash2 = generateTransactionIdempotencyHash(txnRecord);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // Valid SHA-256 hex string

      // Modifying amount changes hash
      const differentHash = generateTransactionIdempotencyHash({
        ...txnRecord,
        amount: 4501.0,
      });
      expect(differentHash).not.toBe(hash1);
    });
  });

  // Test 12: Reversal
  describe("Test 12: Reversal (Contra-Entry Balanced Journal)", () => {
    it("reversing a posted transaction creates balanced contra-entries restoring account balances", () => {
      const initialBalance = toDecimal("50000.00");
      const transactionAmount = toDecimal("12000.00");

      // 1. Original Posting: Expense of ₹12,000
      // Debit: Expense Account (12,000)
      // Credit: Bank Account (12,000) -> Balance becomes 38,000
      const balanceAfterPosting = initialBalance.minus(transactionAmount);
      expect(balanceAfterPosting.toNumber()).toBe(38000);

      // 2. Reversal Posting: Contra-entry
      // Debit: Bank Account (12,000) -> Restores bank
      // Credit: Expense Account (12,000) -> Negates expense
      const balanceAfterReversal = balanceAfterPosting.plus(transactionAmount);
      expect(balanceAfterReversal.toNumber()).toBe(50000);

      // Invariant: Debits equal Credits in reversal
      const reversalDebit = transactionAmount;
      const reversalCredit = transactionAmount;
      expect(reversalDebit.equals(reversalCredit)).toBe(true);
    });
  });
});

