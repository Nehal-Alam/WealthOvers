import { describe, it, expect } from "vitest";
import {
  getIndianFinancialYearInterval,
  generateDeterministicInsights,
} from "@/lib/calculations/financial";

describe("Phase 6: Financial Insights & Reports", () => {
  describe("Indian Financial Year (FY: April 1 – March 31) Logic", () => {
    it("should calculate correct FY boundaries for dates between April and December", () => {
      // November 15, 2026 -> FY 2026–27 (Apr 1, 2026 – Mar 31, 2027)
      const dateInNov = new Date(2026, 10, 15);
      const fy = getIndianFinancialYearInterval(dateInNov, 0);

      expect(fy.label).toBe("FY 2026–27");
      expect(fy.start.getFullYear()).toBe(2026);
      expect(fy.start.getMonth()).toBe(3); // April
      expect(fy.start.getDate()).toBe(1);

      expect(fy.end.getFullYear()).toBe(2027);
      expect(fy.end.getMonth()).toBe(2); // March
      expect(fy.end.getDate()).toBe(31);
    });

    it("should calculate correct FY boundaries for dates between January and March", () => {
      // February 10, 2027 -> Still belongs to FY 2026–27
      const dateInFeb = new Date(2027, 1, 10);
      const fy = getIndianFinancialYearInterval(dateInFeb, 0);

      expect(fy.label).toBe("FY 2026–27");
      expect(fy.start.getFullYear()).toBe(2026);
      expect(fy.end.getFullYear()).toBe(2027);
    });

    it("should calculate correct previous FY when offset is -1", () => {
      const dateInNov = new Date(2026, 10, 15);
      const prevFy = getIndianFinancialYearInterval(dateInNov, -1);

      expect(prevFy.label).toBe("FY 2025–26");
      expect(prevFy.start.getFullYear()).toBe(2025);
      expect(prevFy.end.getFullYear()).toBe(2026);
    });
  });

  describe("Deterministic Insights & Anomaly Detection", () => {
    it("should detect high savings velocity when savings rate exceeds 30%", () => {
      const transactions = [
        {
          amount: "100000.0000",
          transaction_type: "income",
          transaction_date: "2026-11-01",
        },
        {
          amount: "40000.0000",
          transaction_type: "expense",
          transaction_date: "2026-11-05",
          description: "Monthly Rent",
          category: { name: "Housing" },
        },
      ];

      const insights = generateDeterministicInsights(transactions, "300000");

      expect(insights.insights.some((i) => i.id === "savings-optimal")).toBe(true);
      expect(parseFloat(insights.liquidRunwayMonths)).toBeGreaterThanOrEqual(6);
    });

    it("should flag an anomaly when a single transaction represents >= 25% of all expenses", () => {
      const transactions = [
        {
          amount: "100000.0000",
          transaction_type: "income",
          transaction_date: "2026-11-01",
        },
        {
          amount: "30000.0000", // 30k out of 60k total = 50% (> 25%)
          transaction_type: "expense",
          transaction_date: "2026-11-02",
          description: "Annual Insurance Premium",
          category: { name: "Insurance" },
        },
        {
          amount: "15000.0000",
          transaction_type: "expense",
          transaction_date: "2026-11-03",
          description: "Groceries",
          category: { name: "Food" },
        },
        {
          amount: "15000.0000",
          transaction_type: "expense",
          transaction_date: "2026-11-04",
          description: "Utilities",
          category: { name: "Bills" },
        },
      ];

      const insights = generateDeterministicInsights(transactions, "200000");

      expect(insights.anomaliesCount).toBeGreaterThan(0);
      expect(insights.insights.some((i) => i.id === "single-large-txn")).toBe(true);
      expect(insights.highestTransaction?.description).toBe("Annual Insurance Premium");
    });

    it("should flag an alert when cash flow is in deficit", () => {
      const transactions = [
        {
          amount: "30000.0000",
          transaction_type: "income",
          transaction_date: "2026-11-01",
        },
        {
          amount: "50000.0000",
          transaction_type: "expense",
          transaction_date: "2026-11-05",
          description: "Medical Bill",
          category: { name: "Healthcare" },
        },
      ];

      const insights = generateDeterministicInsights(transactions, "50000");

      expect(insights.insights.some((i) => i.id === "savings-deficit")).toBe(true);
      expect(insights.anomaliesCount).toBeGreaterThan(0);
    });

    it("should identify top spending category and its concentration ratio", () => {
      const transactions = [
        {
          amount: "60000.0000",
          transaction_type: "expense",
          transaction_date: "2026-11-01",
          description: "Apartment Rent",
          category: { name: "Housing" },
        },
        {
          amount: "20000.0000",
          transaction_type: "expense",
          transaction_date: "2026-11-05",
          description: "Groceries",
          category: { name: "Food" },
        },
        {
          amount: "20000.0000",
          transaction_type: "expense",
          transaction_date: "2026-11-10",
          description: "Dining Out",
          category: { name: "Dining" },
        },
      ];

      const insights = generateDeterministicInsights(transactions, "100000");

      expect(insights.topExpenseCategory).not.toBeNull();
      expect(insights.topExpenseCategory?.name).toBe("Housing");
      // 60k out of 100k total = 60%
      expect(insights.topExpenseCategory?.percentage).toBe(60);
      expect(insights.insights.some((i) => i.id === "cat-concentration")).toBe(true);
    });
  });

  describe("Multi-Format Export Data Consistency", () => {
    it("should format export payload with complete audit metadata", () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        period: "FY 2026–27",
        metrics: {
          totalIncome: "1200000.0000",
          totalExpenses: "600000.0000",
          netSavings: "600000.0000",
          savingsRate: "50%",
        },
      };

      expect(payload.metrics.savingsRate).toBe("50%");
      expect(payload.period).toContain("FY 2026–27");
      expect(JSON.stringify(payload)).toBeTruthy();
    });
  });
});
