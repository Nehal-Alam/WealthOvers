import { describe, it, expect } from "vitest";
import {
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  calculateSavingsRate,
  calculateNetWorth,
  calculateBudgetUtilization,
  calculateNextOccurrence,
  calculateBalanceSheetRatios,
  calculateFinancialHealthScore,
} from "../lib/calculations/financial";

describe("Financial Calculations Engine", () => {
  it("performs exact additions and subtractions without IEEE float flaws", () => {
    // 0.1 + 0.2 in JS is 0.30000000000000004
    expect(addMoney(0.1, 0.2)).toBe("0.3000");
    expect(subtractMoney("1000.5000", "250.2500")).toBe("750.2500");
    expect(multiplyMoney("150.25", "3")).toBe("450.7500");
    expect(divideMoney("100", "3")).toBe("33.3333");
  });

  it("calculates savings rate accurately", () => {
    // Income = 100,000, Expenses = 60,000 -> Net = 40,000 (40% savings rate)
    const result1 = calculateSavingsRate(100000, 60000);
    expect(result1.netSavings).toBe("40000.0000");
    expect(result1.savingsRatePercent).toBe("40.00");

    // Zero income edge case
    const zeroInc = calculateSavingsRate(0, 5000);
    expect(zeroInc.netSavings).toBe("-5000.0000");
    expect(zeroInc.savingsRatePercent).toBe("0.00");

    // Expenses higher than income
    const deficit = calculateSavingsRate(50000, 75000);
    expect(deficit.netSavings).toBe("-25000.0000");
    expect(deficit.savingsRatePercent).toBe("-50.00");
  });

  it("calculates net worth with multiple asset and liability balances", () => {
    const liquidBalances = ["50000.00", "25000.50"]; // 75000.50
    const investments = ["120000.00"]; // 120000.00
    const assets = ["500000.00"]; // 500000.00 -> Total assets = 695000.50
    const liabilities = ["150000.00", "12500.25"]; // 162500.25

    // Net worth = 695000.50 - 162500.25 = 532500.2500
    const netWorth = calculateNetWorth(liquidBalances, investments, assets, liabilities);
    expect(netWorth).toBe("532500.2500");
  });

  it("calculates budget utilization and alert thresholds", () => {
    // 50,000 allocated, 35,000 spent -> 15,000 remaining, 70% used, not over budget
    const normal = calculateBudgetUtilization(50000, 35000);
    expect(normal.remaining).toBe("15000.0000");
    expect(normal.percentage).toBe(70);
    expect(normal.isOverBudget).toBe(false);

    // Over budget case
    const over = calculateBudgetUtilization(10000, 12500);
    expect(over.remaining).toBe("-2500.0000");
    expect(over.percentage).toBe(125);
    expect(over.isOverBudget).toBe(true);
  });

  it("calculates recurring occurrences properly", () => {
    const nextMonthly = calculateNextOccurrence("2026-01-15", "monthly", 1, new Date("2026-03-01"));
    expect(nextMonthly).toBe("2026-03-15");

    const futureDate = calculateNextOccurrence("2026-12-01", "monthly", 1, new Date("2026-10-31"));
    expect(futureDate).toBe("2026-12-01");
  });

  it("calculates deterministic financial health score and balance sheet ratios", () => {
    // 1. Balance sheet ratios test
    const ratios = calculateBalanceSheetRatios({
      liquidBalances: ["50000.00", "25000.00"], // 75k liquid
      investmentValuations: ["100000.00"],      // 100k invested
      tangibleAssets: ["200000.00"],            // 200k tangible -> Total Assets: 375k
      creditLiabilities: ["15000.00"],          // 15k credit
      loanLiabilities: ["50000.00"],            // 50k loan -> Total Debt: 65k
      monthlyExpenses: 25000,
    });

    expect(ratios.totalAssets).toBe("375000.0000");
    expect(ratios.totalLiabilities).toBe("65000.0000");
    expect(ratios.netWorth).toBe("310000.0000");
    expect(ratios.liquidNetWorth).toBe("60000.0000"); // 75k - 15k
    expect(ratios.investedNetWorth).toBe("100000.0000");
    expect(ratios.debtToAssetRatio).toBe("17.33"); // 65k / 375k * 100
    expect(ratios.liquidityRatio).toBe("3.0"); // 75k / 25k

    // 2. Health score test
    const health = calculateFinancialHealthScore({
      liquidCapital: "75000.00",
      monthlyOutflow: "25000.00",
      totalAssets: "375000.00",
      totalLiabilities: "65000.00",
      savingsRatePercent: "35.00",
      creditUsed: "15000.00",
      totalCreditLimit: "100000.00",
    });

    // Expect optimal/good rating based on 4 pillars
    expect(health.score).toBeGreaterThanOrEqual(80);
    expect(["Excellent", "Good"]).toContain(health.grade);
    expect(health.pillars.length).toBe(4);
    expect(health.pillars[0].name).toBe("Emergency Runway");
    expect(health.pillars[1].name).toBe("Debt-to-Asset");
    expect(health.pillars[2].name).toBe("Savings Rate");
    expect(health.pillars[3].name).toBe("Credit Utilization");
  });
});

