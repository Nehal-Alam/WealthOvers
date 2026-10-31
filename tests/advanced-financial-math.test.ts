import { describe, it, expect } from "vitest";
import { addMonths } from "date-fns";
import {
  calculateLoanEMI,
  generateAmortizationSchedule,
  calculateInvestmentReturns,
  calculateXIRR,
  calculateGoalMonthlyRequired,
  convertCurrency,
} from "../lib/calculations/financial";

describe("Advanced Financial Calculations Engine", () => {
  it("calculates loan EMI and total interest accurately", () => {
    // Principal: 1,000,000, Annual Rate: 8.5%, Tenure: 120 months (10 years)
    const result = calculateLoanEMI(1000000, 8.5, 120);
    // Standard EMI is approx 12,398.57
    expect(parseFloat(result.monthlyEmi)).toBeCloseTo(12398.57, 1);
    expect(parseFloat(result.totalPayment)).toBeGreaterThan(1000000);
    expect(parseFloat(result.totalInterest)).toBeCloseTo(487828.0, 0);

    // Zero interest rate edge case
    const zeroInterest = calculateLoanEMI(120000, 0, 12);
    expect(zeroInterest.monthlyEmi).toBe("10000.0000");
    expect(zeroInterest.totalInterest).toBe("0.0000");
  });

  it("generates complete loan amortization schedule with declining balance", () => {
    const schedule = generateAmortizationSchedule(100000, 10, 12, "2026-01-01");
    expect(schedule.length).toBe(12);
    expect(schedule[0].month).toBe(1);
    expect(parseFloat(schedule[0].remainingBalance)).toBeLessThan(100000);
    // Final balance must reach 0
    expect(parseFloat(schedule[11].remainingBalance)).toBe(0);
  });

  it("calculates investment returns and currency conversion for US stocks", () => {
    // 10 shares bought at $150, current price $200, USD/INR rate = 84.50
    const returns = calculateInvestmentReturns(10, 150, 200, "USD", 84.5);
    // Invested: 10 * 150 * 84.50 = 126,750
    // Valuation: 10 * 200 * 84.50 = 169,000
    // PnL: 42,250 (+33.33%)
    expect(parseFloat(returns.investedAmount)).toBe(126750);
    expect(parseFloat(returns.currentValuation)).toBe(169000);
    expect(parseFloat(returns.unrealizedPnL)).toBe(42250);
    expect(returns.absoluteReturnPercent).toBe("33.33");
    expect(returns.isProfit).toBe(true);
  });

  it("calculates exact XIRR using Newton-Raphson solver", () => {
    // Invest 100,000 on 2025-01-01, current value 115,000 on 2026-01-01 (approx 15% annual return)
    const cashFlows = [
      { amount: -100000, date: "2025-01-01" },
      { amount: 115000, date: "2026-01-01" },
    ];
    const xirr = calculateXIRR(cashFlows);
    expect(xirr).not.toBeNull();
    expect(xirr).toBeCloseTo(15.0, 1);
  });

  it("calculates required monthly savings to achieve financial goals", () => {
    const now = new Date();
    const targetDate = addMonths(now, 10);

    const goal = calculateGoalMonthlyRequired(600000, 100000, targetDate);
    expect(parseFloat(goal.remainingAmount)).toBe(500000);
    expect(goal.progressPercent).toBeCloseTo(16.67, 1);
    expect(parseFloat(goal.monthlyRequired)).toBeCloseTo(50000, 0);
  });
});
