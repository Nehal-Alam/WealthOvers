import Decimal from "decimal.js";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
  parseISO,
  differenceInMonths,
  differenceInCalendarMonths,
  differenceInDays,
} from "date-fns";

// Configure Decimal for high financial precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const DEFAULT_USD_INR_RATE = 84.5;

export type RecurrenceInterval =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

export interface AmortizationScheduleRow {
  month: number;
  paymentDate: string;
  emi: string;
  principalComponent: string;
  interestComponent: string;
  remainingBalance: string;
}

export interface InvestmentReturns {
  investedAmount: string;
  currentValuation: string;
  unrealizedPnL: string;
  absoluteReturnPercent: string;
  isProfit: boolean;
}

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
 * Convert Currency (e.g. USD to INR)
 */
export function convertCurrency(
  amount: number | string | Decimal,
  fromCurrency: string,
  toCurrency: string = "INR",
  exchangeRate: number = DEFAULT_USD_INR_RATE
): string {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return toDecimal(amount).toFixed(4);
  }
  if (fromCurrency.toUpperCase() === "USD" && toCurrency.toUpperCase() === "INR") {
    return toDecimal(amount).times(exchangeRate).toFixed(4);
  }
  if (fromCurrency.toUpperCase() === "INR" && toCurrency.toUpperCase() === "USD") {
    return toDecimal(amount).dividedBy(exchangeRate).toFixed(4);
  }
  return toDecimal(amount).toFixed(4);
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
 * Net Worth = Liquid Accounts + Investments + Assets - Liabilities - Loans - Credit Cards
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

/**
 * Loan Monthly EMI Calculation
 * Formula: EMI = [P x r x (1+r)^n] / [(1+r)^n - 1]
 * where r = annualRate / (12 * 100), n = tenureMonths
 */
export function calculateLoanEMI(
  principalAmount: number | string | Decimal,
  annualInterestRate: number | string | Decimal,
  tenureMonths: number
): {
  monthlyEmi: string;
  totalPayment: string;
  totalInterest: string;
} {
  const p = toDecimal(principalAmount);
  const annualRate = toDecimal(annualInterestRate);
  const n = Math.max(1, tenureMonths);

  if (annualRate.isZero() || annualRate.lessThan(0)) {
    const emi = p.dividedBy(n);
    return {
      monthlyEmi: emi.toFixed(4),
      totalPayment: p.toFixed(4),
      totalInterest: "0.0000",
    };
  }

  const r = annualRate.dividedBy(1200); // monthly interest rate
  const onePlusRPowN = new Decimal(1).plus(r).pow(n);
  const numerator = p.times(r).times(onePlusRPowN);
  const denominator = onePlusRPowN.minus(1);
  const emi = numerator.dividedBy(denominator);

  const totalPayment = emi.times(n);
  const totalInterest = totalPayment.minus(p);

  return {
    monthlyEmi: emi.toFixed(4),
    totalPayment: totalPayment.toFixed(4),
    totalInterest: totalInterest.toFixed(4),
  };
}

/**
 * Generate Loan Amortization Schedule
 */
export function generateAmortizationSchedule(
  principalAmount: number | string | Decimal,
  annualInterestRate: number | string | Decimal,
  tenureMonths: number,
  startDateStr: string | Date = new Date()
): AmortizationScheduleRow[] {
  const p = toDecimal(principalAmount);
  const annualRate = toDecimal(annualInterestRate);
  const n = Math.max(1, tenureMonths);
  const { monthlyEmi } = calculateLoanEMI(p, annualRate, n);
  const emi = toDecimal(monthlyEmi);
  const r = annualRate.dividedBy(1200);

  let currentBalance = p;
  let currentDate = typeof startDateStr === "string" ? parseISO(startDateStr) : startDateStr;
  const schedule: AmortizationScheduleRow[] = [];

  for (let month = 1; month <= n; month++) {
    currentDate = addMonths(currentDate, 1);
    const interestComponent = currentBalance.times(r);
    let principalComponent = emi.minus(interestComponent);

    if (month === n || currentBalance.minus(principalComponent).lessThan(0)) {
      principalComponent = currentBalance;
      currentBalance = new Decimal(0);
    } else {
      currentBalance = currentBalance.minus(principalComponent);
    }

    schedule.push({
      month,
      paymentDate: format(currentDate, "yyyy-MM-dd"),
      emi: principalComponent.plus(interestComponent).toFixed(4),
      principalComponent: principalComponent.toFixed(4),
      interestComponent: interestComponent.toFixed(4),
      remainingBalance: currentBalance.toFixed(4),
    });

    if (currentBalance.isZero()) break;
  }

  return schedule;
}

/**
 * Calculate Investment Holding Valuation and Returns
 */
export function calculateInvestmentReturns(
  quantity: number | string | Decimal,
  averageBuyPrice: number | string | Decimal,
  currentPrice: number | string | Decimal,
  currency: string = "INR",
  exchangeRate: number = DEFAULT_USD_INR_RATE
): InvestmentReturns {
  const qty = toDecimal(quantity);
  const avg = toDecimal(averageBuyPrice);
  const cur = toDecimal(currentPrice);

  let invested = qty.times(avg);
  let valuation = qty.times(cur);

  if (currency.toUpperCase() === "USD") {
    invested = invested.times(exchangeRate);
    valuation = valuation.times(exchangeRate);
  }

  const pnl = valuation.minus(invested);
  let absReturn = "0.00";
  if (!invested.isZero()) {
    absReturn = pnl.dividedBy(invested).times(100).toFixed(2);
  }

  return {
    investedAmount: invested.toFixed(4),
    currentValuation: valuation.toFixed(4),
    unrealizedPnL: pnl.toFixed(4),
    absoluteReturnPercent: absReturn,
    isProfit: pnl.greaterThanOrEqualTo(0),
  };
}

/**
 * Calculate XIRR using the Newton-Raphson Method
 * Solves: sum [ C_i / (1 + r)^((d_i - d_0) / 365) ] = 0
 * cashFlows: array of { amount: number, date: Date | string }
 * Note: Buy transactions are negative amounts, Sell/Valuation are positive amounts.
 */
export function calculateXIRR(
  cashFlows: { amount: number | string; date: Date | string }[],
  guessRate: number = 0.1
): number | null {
  if (cashFlows.length < 2) return null;

  const parsedFlows = cashFlows
    .map((cf) => ({
      amount: typeof cf.amount === "string" ? parseFloat(cf.amount) : cf.amount,
      date: typeof cf.date === "string" ? parseISO(cf.date) : cf.date,
    }))
    .filter((cf) => !isNaN(cf.amount) && cf.amount !== 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (parsedFlows.length < 2) return null;

  const hasNegative = parsedFlows.some((cf) => cf.amount < 0);
  const hasPositive = parsedFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  const d0 = parsedFlows[0].date;
  let rate = guessRate;
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let iter = 0; iter < maxIterations; iter++) {
    let fValue = 0;
    let fDerivative = 0;

    for (const cf of parsedFlows) {
      const days = differenceInDays(cf.date, d0);
      const years = days / 365.0;
      const factor = Math.pow(1 + rate, years);

      if (factor === 0 || isNaN(factor)) return null;

      fValue += cf.amount / factor;
      fDerivative -= (years * cf.amount) / (factor * (1 + rate));
    }

    if (Math.abs(fValue) < tolerance) {
      return Math.round(rate * 10000) / 100; // Return percentage with 2 decimals e.g. 14.50
    }

    if (fDerivative === 0 || isNaN(fDerivative)) break;

    const newRate = rate - fValue / fDerivative;
    if (isNaN(newRate) || !isFinite(newRate)) break;
    rate = newRate;
  }

  // Fallback if solver didn't converge within bounds
  return null;
}

/**
 * Calculate Monthly Savings Required to reach Financial Goal
 */
export function calculateGoalMonthlyRequired(
  targetAmount: number | string | Decimal,
  currentAmount: number | string | Decimal,
  targetDateStr: string | Date,
  referenceDate: string | Date = new Date()
): {
  remainingAmount: string;
  monthlyRequired: string;
  progressPercent: number;
  monthsRemaining: number;
} {
  const target = toDecimal(targetAmount);
  const current = toDecimal(currentAmount);
  const remaining = target.minus(current);

  const targetDate = typeof targetDateStr === "string" ? parseISO(targetDateStr) : targetDateStr;
  const now = typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate;
  const monthsRemaining = Math.max(1, differenceInCalendarMonths(targetDate, now));

  let progress = 0;
  if (!target.isZero()) {
    progress = current.dividedBy(target).times(100).toNumber();
  }

  let monthly = "0.0000";
  if (remaining.greaterThan(0)) {
    monthly = remaining.dividedBy(monthsRemaining).toFixed(4);
  }

  return {
    remainingAmount: remaining.greaterThan(0) ? remaining.toFixed(4) : "0.0000",
    monthlyRequired: monthly,
    progressPercent: Math.min(Math.round(progress * 100) / 100, 100),
    monthsRemaining,
  };
}
