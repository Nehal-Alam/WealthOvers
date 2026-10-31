import { describe, it, expect } from "vitest";
import { calculateNextOccurrence } from "../lib/calculations/financial";

describe("Recurring Occurrences Engine", () => {
  it("calculates weekly recurring next date correctly", () => {
    // Start date 2026-10-01 (Thursday), after date 2026-10-15 (Thursday)
    const nextDate = calculateNextOccurrence("2026-10-01", "weekly", 1, new Date("2026-10-15"));
    expect(nextDate).toBe("2026-10-15");

    const afterDate = calculateNextOccurrence("2026-10-01", "weekly", 1, new Date("2026-10-16"));
    expect(afterDate).toBe("2026-10-22");
  });

  it("calculates bi-weekly recurring next date correctly", () => {
    const nextDate = calculateNextOccurrence("2026-10-01", "biweekly", 1, new Date("2026-10-20"));
    expect(nextDate).toBe("2026-10-29");
  });

  it("calculates quarterly and yearly intervals correctly", () => {
    const quarterly = calculateNextOccurrence("2026-01-01", "quarterly", 1, new Date("2026-05-01"));
    expect(quarterly).toBe("2026-07-01");

    const yearly = calculateNextOccurrence("2025-10-31", "yearly", 1, new Date("2026-10-31"));
    expect(yearly).toBe("2026-10-31");
  });
});
