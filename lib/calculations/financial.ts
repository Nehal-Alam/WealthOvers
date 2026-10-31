import Decimal from "decimal.js";
import { addDays, addWeeks, addMonths, addYears, format, parseISO } from "date-fns";

// Configure Decimal for high financial precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type RecurrenceInterval =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

/**
 * Safely parse any numeric value or string into a Decimal
 */
export function toDecimal(val: number | string | Decimal | null | undefined): Decimal {
  if (val === null || val === undefined || val === "") {
    return new Decimal(0);
  }
  if (val instanceof Decimal) {
    return val;
  }
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Exact monetary addition: a + b
 */
export function addMoney(a: number | string | Decimal, b: number | string | Decimal): string {
  return toDecimal(a).plus(toDecimal(b)).toFixed(4);
}

/**
 * Exact monetary subtraction: a - b
 */
export function subtractMoney(a: number | string | Decimal, b: number | string | Decimal): string {
  return toDecimal(a).minus(toDecimal(b)).toFixed(4);
}

/**
 * Exact monetary multiplication: a * b
 */
export function multiplyMoney(a: number | string | Decimal, b: number | string | Decimal): string {
  return toDecimal(a).times(toDecimal(b)).toFixed(4);
}

/**
 * Exact monetary division: a / b
 */
export function divideMoney(a: number | string | Decimal, b: number | string | Decimal): string {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    return "0.0000";
  }
  return toDecimal(a).dividedBy(divisor).toFixed(4);
}

/**
 * Format any amount into standard 2-decimal financial string
 */
export function format2Decimals(val: number | string | Decimal): string {
  return toDecimal(val).toFixed(2);
}

/**
 * Calculate net savings and savings rate percentage
 */
export function calculateSavingsRate(
  totalIncome: number | string | Decimal,
  totalExpenses: number | string | Decimal
): {
  netSavings: string;
  savingsRatePercent: string;
} {
  const inc = toDecimal(totalIncome);
  const exp = toDecimal(totalExpenses);
  const net = inc.minus(exp);

  if (inc.lessThanOrEqualTo(0)) {
    return {
      netSavings: net.toFixed(4),
      savingsRatePercent: "0.00",
    };
  }

  const rate = net.dividedBy(inc).times(100);
  return {
    netSavings: net.toFixed(4),
    savingsRatePercent: rate.toFixed(2),
  };
}

/**
 * Calculate Net Worth:
 * Net Worth = Liquid Accounts + Investments + Assets - Liabilities
 */
export function calculateNetWorth(
  liquidBalances: (number | string | Decimal)[],
  investmentValuations: (number | string | Decimal)[] = [],
  assetValuations: (number | string | Decimal)[] = [],
  liabilityBalances: (number | string | Decimal)[] = []
): string {
  let totalAssets = new Decimal(0);
  for (const b of liquidBalances) {
    totalAssets = totalAssets.plus(toDecimal(b));
  }
  for (const inv of investmentValuations) {
    totalAssets = totalAssets.plus(toDecimal(inv));
  }
  for (const ast of assetValuations) {
    totalAssets = totalAssets.plus(toDecimal(ast));
  }

  let totalLiabilities = new Decimal(0);
  for (const lia of liabilityBalances) {
    totalLiabilities = totalLiabilities.plus(toDecimal(lia));
  }

  return totalAssets.minus(totalLiabilities).toFixed(4);
}

/**
 * Calculate Budget Utilization
 */
export function calculateBudgetUtilization(
  allocatedAmount: number | string | Decimal,
  spentAmount: number | string | Decimal
): {
  remaining: string;
  percentage: number;
  isOverBudget: boolean;
} {
  const allocated = toDecimal(allocatedAmount);
  const spent = toDecimal(spentAmount);
  const remaining = allocated.minus(spent);

  let percentage = 0;
  if (!allocated.isZero()) {
    percentage = spent.dividedBy(allocated).times(100).toNumber();
  } else if (spent.greaterThan(0)) {
    percentage = 100;
  }

  return {
    remaining: remaining.toFixed(4),
    percentage: Math.min(Math.round(percentage * 100) / 100, 999),
    isOverBudget: spent.greaterThan(allocated),
  };
}

/**
 * Calculate next occurrence date for recurring transactions
 * Uses calendar yyyy-MM-dd comparison to prevent timezone boundary bugs
 */
export function calculateNextOccurrence(
  startDateStr: string | Date,
  interval: RecurrenceInterval,
  intervalCount: number = 1,
  afterDate: Date | string = new Date()
): string {
  let current = typeof startDateStr === "string" ? parseISO(startDateStr) : startDateStr;
  const after = typeof afterDate === "string" ? parseISO(afterDate) : afterDate;
  const afterFormatted = format(after, "yyyy-MM-dd");
  const count = Math.max(1, intervalCount);

  let guard = 0;
  while (format(current, "yyyy-MM-dd") < afterFormatted && guard < 1000) {
    guard++;
    switch (interval) {
      case "daily":
        current = addDays(current, count);
        break;
      case "weekly":
        current = addWeeks(current, count);
        break;
      case "biweekly":
        current = addWeeks(current, 2 * count);
        break;
      case "monthly":
        current = addMonths(current, count);
        break;
      case "quarterly":
        current = addMonths(current, 3 * count);
        break;
      case "half_yearly":
        current = addMonths(current, 6 * count);
        break;
      case "yearly":
        current = addYears(current, count);
        break;
      default:
        current = addMonths(current, count);
    }
  }

  return format(current, "yyyy-MM-dd");
}
