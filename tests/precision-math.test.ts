import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { formatCurrency } from "@/lib/utils";

describe("Financial Calculation Accuracy & Formatting", () => {
  it("should prevent native IEEE 754 floating-point rounding errors", () => {
    // In native JS float: 0.1 + 0.2 === 0.30000000000000004
    const nativeFloatSum = 0.1 + 0.2;
    expect(nativeFloatSum).not.toBe(0.3);

    // Using Decimal.js: exactly 0.3
    const decimalSum = new Decimal("0.1").plus(new Decimal("0.2"));
    expect(decimalSum.toNumber()).toBe(0.3);
    expect(decimalSum.toFixed(4)).toBe("0.3000");
  });

  it("should calculate cumulative balances with zero precision loss", () => {
    const transactions = [
      "12450.75",
      "532.10",
      "99.99",
      "-4500.50",
      "-125.34",
    ];

    let runningBalance = new Decimal("100000.00");
    for (const tx of transactions) {
      runningBalance = runningBalance.plus(new Decimal(tx));
    }

    expect(runningBalance.toFixed(4)).toBe("108457.0000");
  });

  it("should format currency in Indian numbering system (en-IN)", () => {
    const formatted = formatCurrency("150000.50", "INR", "en-IN", false);
    // Should format with ₹ and appropriate Indian comma placement
    expect(formatted).toContain("1,50,000.50");
  });

  it("should obfuscate numbers when privacy mode is enabled", () => {
    const masked = formatCurrency("150000.50", "INR", "en-IN", true);
    expect(masked).toBe("••••••");
  });
});

