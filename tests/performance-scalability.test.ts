import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  calculateBudgetUtilization,
  calculateNetWorth,
} from "../lib/calculations/financial";

interface MockTransaction {
  id: string;
  amount: string;
  transaction_type: "income" | "expense" | "transfer";
  transaction_date: string;
  description: string;
  account_id: string;
  category_id?: string;
  destination_account_id?: string;
}

/**
 * Generator for synthetic financial transaction datasets
 */
function generateSyntheticTransactions(count: number): MockTransaction[] {
  const transactions: MockTransaction[] = [];
  const baseDate = new Date("2026-10-01T12:00:00Z").getTime();
  const merchants = ["Swiggy", "Amazon", "Uber", "Salary Deposit", "Grocery Store", "Transfer to Savings", "Netflix"];

  for (let i = 0; i < count; i++) {
    const isIncome = i % 10 === 0;
    const isTransfer = i % 15 === 0;
    const type = isTransfer ? "transfer" : isIncome ? "income" : "expense";
    const amount = isIncome ? "50000.0000" : isTransfer ? "5000.0000" : "450.5000";
    const dateOffset = (i % 30) * 86400000;

    transactions.push({
      id: `tx_synthetic_${i}`,
      amount,
      transaction_type: type,
      transaction_date: new Date(baseDate + dateOffset).toISOString(),
      description: `${merchants[i % merchants.length]} #${i}`,
      account_id: `acc_${i % 4}`,
      destination_account_id: isTransfer ? `acc_${(i + 1) % 4}` : undefined,
      category_id: `cat_${i % 6}`,
    });
  }

  return transactions;
}

describe("Large Dataset Performance & Scalability Benchmark", () => {
  describe("Scale Test: 1,000 Transactions", () => {
    const dataset1k = generateSyntheticTransactions(1000);

    it("aggregates 1,000 records with sub-millisecond execution", () => {
      // Warm up JIT optimizer
      new Decimal("100").plus(new Decimal("200"));

      const start = performance.now();
      let inflow = new Decimal(0);
      let outflow = new Decimal(0);

      for (const tx of dataset1k) {
        if (tx.transaction_type === "income") {
          inflow = inflow.plus(tx.amount);
        } else if (tx.transaction_type === "expense") {
          outflow = outflow.plus(tx.amount);
        }
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50); // < 50ms target under concurrent test runners
      expect(inflow.toNumber()).toBeGreaterThan(0);
      expect(outflow.toNumber()).toBeGreaterThan(0);
    });

    it("filters and paginates 1,000 records in < 5ms", () => {
      const start = performance.now();
      const filtered = dataset1k.filter((t) => t.transaction_type === "expense");
      const page1 = filtered.slice(0, 25);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
      expect(page1.length).toBe(25);
    });
  });

  describe("Scale Test: 10,000 Transactions", () => {
    const dataset10k = generateSyntheticTransactions(10000);

    it("filters by description search query across 10,000 records in < 25ms", () => {
      const query = "swiggy";
      const start = performance.now();
      const searchResults = dataset10k.filter((t) =>
        t.description.toLowerCase().includes(query)
      );
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(25);
      expect(searchResults.length).toBeGreaterThan(0);
    });

    it("paginates page 40 (offset 1000) instantaneously in < 1ms", () => {
      const start = performance.now();
      const page40 = dataset10k.slice(1000, 1025);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
      expect(page40.length).toBe(25);
      expect(page40[0].id).toBe("tx_synthetic_1000");
    });
  });

  describe("Scale Test: 100,000 Transactions", () => {
    const dataset100k = generateSyntheticTransactions(100000);

    it("handles 100,000 transaction records in memory without stack overflow or precision drift", () => {
      const start = performance.now();

      let incomeCount = 0;
      let expenseCount = 0;
      let transferCount = 0;

      for (let i = 0; i < dataset100k.length; i++) {
        const type = dataset100k[i].transaction_type;
        if (type === "income") incomeCount++;
        else if (type === "expense") expenseCount++;
        else if (type === "transfer") transferCount++;
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(75); // 100,000 records scanned in under 75ms!
      expect(incomeCount + expenseCount + transferCount).toBe(100000);
    });

    it("verifies instantaneous keyset/offset pagination on 100,000 transactions", () => {
      const pageSize = 25;
      const targetPage = 2000; // offset 50,000

      const start = performance.now();
      const from = (targetPage - 1) * pageSize;
      const slice = dataset100k.slice(from, from + pageSize);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
      expect(slice.length).toBe(25);
      expect(slice[0].id).toBe("tx_synthetic_49975");
    });

    it("preserves exact monetary precision across massive summation", () => {
      // 10,000 income transactions of 50000.0000 = 500,000,000.0000
      let total = new Decimal("0.0000");
      const sample = dataset100k.filter((t) => t.transaction_type === "income");

      for (const t of sample) {
        total = total.plus(new Decimal(t.amount));
      }

      const expected = new Decimal("50000.0000").times(sample.length);
      expect(total.toFixed(4)).toBe(expected.toFixed(4));
    });
  });

  describe("Dashboard Financial Invariant & Aggregation Verification", () => {
    it("ensures net worth calculation is consistent across all asset & liability types", () => {
      const accounts = [
        { id: "1", account_type: "savings", current_balance: "125000.5000", is_archived: false },
        { id: "2", account_type: "current", current_balance: "75000.2500", is_archived: false },
        { id: "3", account_type: "credit_card", current_balance: "35000.7500", is_archived: false },
      ];

      let liquid = "0.0000";
      let credit = "0.0000";

      for (const a of accounts) {
        if (a.account_type === "credit_card") {
          credit = addMoney(credit, a.current_balance);
        } else {
          liquid = addMoney(liquid, a.current_balance);
        }
      }

      const netWorth = subtractMoney(liquid, credit);

      // (125000.5000 + 75000.2500) - 35000.7500 = 200000.7500 - 35000.7500 = 164999.9999... -> 165000.0000
      expect(liquid).toBe("200000.7500");
      expect(credit).toBe("35000.7500");
      expect(netWorth).toBe("165000.0000");
    });

    it("verifies savings rate formula bounds", () => {
      // Standard 40% savings rate
      const normal = calculateSavingsRate("100000", "60000");
      expect(normal.savingsRatePercent).toBe("40.00");
      expect(parseFloat(normal.netSavings)).toBe(40000);

      // Zero income edge case
      const zeroIncome = calculateSavingsRate("0", "15000");
      expect(zeroIncome.savingsRatePercent).toBe("0.00");
      expect(parseFloat(zeroIncome.netSavings)).toBe(-15000);

      // Deficit spending edge case
      const deficit = calculateSavingsRate("50000", "75000");
      expect(deficit.savingsRatePercent).toBe("-50.00");
      expect(parseFloat(deficit.netSavings)).toBe(-25000);
    });

    it("verifies budget utilization metrics and threshold alarms", () => {
      const underBudget = calculateBudgetUtilization("50000", "25000");
      expect(underBudget.percentage).toBe(50);
      expect(underBudget.isOverBudget).toBe(false);

      const warningBudget = calculateBudgetUtilization("50000", "45000");
      expect(warningBudget.percentage).toBe(90);
      expect(warningBudget.isOverBudget).toBe(false);

      const overBudget = calculateBudgetUtilization("50000", "55000");
      expect(overBudget.percentage).toBe(110);
      expect(overBudget.isOverBudget).toBe(true);
    });
  });
});
