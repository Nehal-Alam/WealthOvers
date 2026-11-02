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

export interface LoanPrepaymentSimulation {
  originalTenureMonths: number;
  revisedTenureMonths: number;
  monthsSaved: number;
  yearsSaved: string;
  originalTotalInterest: string;
  revisedTotalInterest: string;
  interestSaved: string;
  originalTotalPayment: string;
  revisedTotalPayment: string;
  schedule: AmortizationScheduleRow[];
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
 * Simulate loan prepayment (extra monthly payment and/or one-time lumpsum)
 * Calculates revised tenure, total interest saved, and accelerated payoff schedule.
 */
export function calculateLoanPrepayment(
  principalAmount: number | string | Decimal,
  annualInterestRate: number | string | Decimal,
  tenureMonths: number,
  extraMonthlyPayment: number | string | Decimal = 0,
  lumpsumPayment: number | string | Decimal = 0,
  lumpsumMonth: number = 1,
  startDateStr: string | Date = new Date()
): LoanPrepaymentSimulation {
  const p = toDecimal(principalAmount);
  const annualRate = toDecimal(annualInterestRate);
  const n = Math.max(1, tenureMonths);
  const { monthlyEmi } = calculateLoanEMI(p, annualRate, n);
  const baseEmi = toDecimal(monthlyEmi);
  const r = annualRate.dividedBy(1200);

  const extraMonthly = toDecimal(extraMonthlyPayment);
  const lumpsum = toDecimal(lumpsumPayment);

  // 1. Original standard totals
  const standardSchedule = generateAmortizationSchedule(p, annualRate, n, startDateStr);
  let originalTotalInterest = new Decimal(0);
  for (const row of standardSchedule) {
    originalTotalInterest = originalTotalInterest.plus(toDecimal(row.interestComponent));
  }
  const originalTotalPayment = p.plus(originalTotalInterest);

  // If no prepayments are configured, accelerated schedule is identical to standard
  if (extraMonthly.isZero() && lumpsum.isZero()) {
    return {
      originalTenureMonths: n,
      revisedTenureMonths: n,
      monthsSaved: 0,
      yearsSaved: "0.0",
      originalTotalInterest: originalTotalInterest.toFixed(4),
      revisedTotalInterest: originalTotalInterest.toFixed(4),
      interestSaved: "0.0000",
      originalTotalPayment: originalTotalPayment.toFixed(4),
      revisedTotalPayment: originalTotalPayment.toFixed(4),
      schedule: standardSchedule,
    };
  }

  // 2. Accelerated schedule with prepayments
  let currentBalance = p;
  let currentDate = typeof startDateStr === "string" ? parseISO(startDateStr) : startDateStr;
  const acceleratedSchedule: AmortizationScheduleRow[] = [];
  let revisedTotalInterest = new Decimal(0);

  let month = 0;
  const maxCap = Math.max(n, 600);

  while (currentBalance.greaterThan(0.0001) && month < maxCap) {
    month++;
    currentDate = addMonths(currentDate, 1);

    // One-time lumpsum prepayment in the specified month
    if (month === lumpsumMonth && lumpsum.greaterThan(0)) {
      currentBalance = Decimal.max(0, currentBalance.minus(lumpsum));
      if (currentBalance.lessThanOrEqualTo(0.0001)) {
        acceleratedSchedule.push({
          month,
          paymentDate: format(currentDate, "yyyy-MM-dd"),
          emi: lumpsum.toFixed(4),
          principalComponent: lumpsum.toFixed(4),
          interestComponent: "0.0000",
          remainingBalance: "0.0000",
        });
        break;
      }
    }

    const interestComponent = currentBalance.times(r);
    revisedTotalInterest = revisedTotalInterest.plus(interestComponent);

    // Base EMI + extra monthly prepayment
    const totalPaymentTarget = baseEmi.plus(extraMonthly);
    let principalComponent = totalPaymentTarget.minus(interestComponent);

    // Finish loan early if residual balance is less than or equal to 1.00
    if (currentBalance.minus(principalComponent).lessThanOrEqualTo(1.0)) {
      principalComponent = currentBalance;
      currentBalance = new Decimal(0);
    } else {
      currentBalance = currentBalance.minus(principalComponent);
    }

    const actualEmi = principalComponent.plus(interestComponent);
    acceleratedSchedule.push({
      month,
      paymentDate: format(currentDate, "yyyy-MM-dd"),
      emi: actualEmi.toFixed(4),
      principalComponent: principalComponent.toFixed(4),
      interestComponent: interestComponent.toFixed(4),
      remainingBalance: currentBalance.toFixed(4),
    });

    if (currentBalance.isZero()) break;
  }

  const revisedTenureMonths = month;
  const monthsSaved = Math.max(0, n - revisedTenureMonths);
  const yearsSaved = (monthsSaved / 12).toFixed(1);
  const interestSaved = Decimal.max(0, originalTotalInterest.minus(revisedTotalInterest));
  const revisedTotalPayment = p.plus(revisedTotalInterest);

  return {
    originalTenureMonths: n,
    revisedTenureMonths,
    monthsSaved,
    yearsSaved,
    originalTotalInterest: originalTotalInterest.toFixed(4),
    revisedTotalInterest: revisedTotalInterest.toFixed(4),
    interestSaved: interestSaved.toFixed(4),
    originalTotalPayment: originalTotalPayment.toFixed(4),
    revisedTotalPayment: revisedTotalPayment.toFixed(4),
    schedule: acceleratedSchedule,
  };
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

/**
 * Calculate the daily allowable safe spending rate given remaining budget and cycle end date
 */
export function calculateDailySafeSpend(
  remainingAmount: number | string | Decimal,
  endDateStr: string | Date,
  referenceDate: string | Date = new Date()
): {
  daysRemaining: number;
  dailySafeSpend: string;
  isOverspent: boolean;
} {
  const rem = toDecimal(remainingAmount);
  const end = typeof endDateStr === "string" ? parseISO(endDateStr) : endDateStr;
  const now = typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate;
  const daysDiff = differenceInDays(end, now);
  const daysRemaining = Math.max(1, daysDiff + 1);

  if (rem.lessThanOrEqualTo(0)) {
    return {
      daysRemaining,
      dailySafeSpend: "0.0000",
      isOverspent: rem.isNegative(),
    };
  }

  const daily = rem.dividedBy(daysRemaining);
  return {
    daysRemaining,
    dailySafeSpend: daily.toFixed(4),
    isOverspent: false,
  };
}

export interface RecurringRuleForecastItem {
  amount: number | string | Decimal;
  recurrence_interval: string;
  transaction_type: string;
  is_active: boolean;
}

export interface CashFlowForecastPeriod {
  days: number;
  label: string;
  inflows: string;
  outflows: string;
  netCashFlow: string;
  isNetPositive: boolean;
}

/**
 * Projects multi-horizon cash flow (30, 60, 90 days) from recurring rules
 */
export function calculateCashFlowForecast(
  rules: RecurringRuleForecastItem[],
  horizonDays: number[] = [30, 60, 90]
): CashFlowForecastPeriod[] {
  return horizonDays.map((days) => {
    let inflows = new Decimal(0);
    let outflows = new Decimal(0);

    for (const rule of rules) {
      if (!rule.is_active) continue;
      const amt = toDecimal(rule.amount);

      // Estimate number of occurrences within the horizon
      let occurrences = 0;
      switch (rule.recurrence_interval) {
        case "daily":
          occurrences = days;
          break;
        case "weekly":
          occurrences = Math.floor(days / 7);
          break;
        case "biweekly":
          occurrences = Math.floor(days / 14);
          break;
        case "monthly":
          occurrences = Math.floor(days / 30);
          break;
        case "quarterly":
          occurrences = Math.floor(days / 90);
          break;
        case "half_yearly":
          occurrences = Math.floor(days / 180);
          break;
        case "yearly":
          occurrences = Math.floor(days / 365);
          break;
        default:
          occurrences = Math.floor(days / 30);
          break;
      }

      if (occurrences < 1 && days >= 30 && rule.recurrence_interval === "monthly") {
        occurrences = 1;
      }

      const totalPeriodAmount = amt.times(occurrences);
      if (rule.transaction_type === "income") {
        inflows = inflows.plus(totalPeriodAmount);
      } else {
        outflows = outflows.plus(totalPeriodAmount);
      }
    }

    const net = inflows.minus(outflows);

    return {
      days,
      label: `${days} Days`,
      inflows: inflows.toFixed(4),
      outflows: outflows.toFixed(4),
      netCashFlow: net.toFixed(4),
      isNetPositive: net.greaterThanOrEqualTo(0),
    };
  });
}

/**
 * Calculate goal completion trajectory based on current monthly contribution velocity
 */
export function calculateGoalTrajectory(
  targetAmount: number | string | Decimal,
  currentAmount: number | string | Decimal,
  targetDateStr: string | Date,
  monthlyVelocity: number | string | Decimal = 0,
  referenceDate: string | Date = new Date()
): {
  projectedMonthsToComplete: number | null;
  projectedCompletionDate: string | null;
  isOnTrack: boolean;
  varianceMonths: number;
} {
  const target = toDecimal(targetAmount);
  const current = toDecimal(currentAmount);
  const remaining = target.minus(current);
  const velocity = toDecimal(monthlyVelocity);

  const targetDate = typeof targetDateStr === "string" ? parseISO(targetDateStr) : targetDateStr;
  const now = typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate;
  const targetMonthsRemaining = Math.max(1, differenceInCalendarMonths(targetDate, now));

  if (remaining.lessThanOrEqualTo(0)) {
    return {
      projectedMonthsToComplete: 0,
      projectedCompletionDate: format(now, "yyyy-MM-dd"),
      isOnTrack: true,
      varianceMonths: 0,
    };
  }

  if (velocity.lessThanOrEqualTo(0)) {
    return {
      projectedMonthsToComplete: null,
      projectedCompletionDate: null,
      isOnTrack: false,
      varianceMonths: -targetMonthsRemaining,
    };
  }

  const projectedMonths = Math.ceil(remaining.dividedBy(velocity).toNumber());
  const projectedDate = addMonths(now, projectedMonths);
  const variance = targetMonthsRemaining - projectedMonths;

  return {
    projectedMonthsToComplete: projectedMonths,
    projectedCompletionDate: format(projectedDate, "yyyy-MM-dd"),
    isOnTrack: variance >= 0,
    varianceMonths: variance,
  };
}

export interface FinancialHealthResult {
  score: number;
  grade: "Excellent" | "Good" | "Fair" | "Needs Attention";
  summary: string;
  pillars: {
    name: string;
    score: number;
    maxScore: number;
    valueDisplay: string;
    benchmark: string;
    status: "optimal" | "moderate" | "warning";
  }[];
}

/**
 * Transparent 100-point Financial Health Score calculation
 * Based on 4 deterministic financial pillars:
 * 1. Emergency Liquidity Runway (25 pts)
 * 2. Debt-to-Asset Ratio (25 pts)
 * 3. Monthly Savings Discipline (25 pts)
 * 4. Revolving Credit Utilization (25 pts)
 */
export function calculateFinancialHealthScore({
  liquidCapital,
  monthlyOutflow,
  totalAssets,
  totalLiabilities,
  savingsRatePercent,
  creditUsed = "0",
  totalCreditLimit = "0",
}: {
  liquidCapital: number | string | Decimal;
  monthlyOutflow: number | string | Decimal;
  totalAssets: number | string | Decimal;
  totalLiabilities: number | string | Decimal;
  savingsRatePercent: number | string;
  creditUsed?: number | string | Decimal;
  totalCreditLimit?: number | string | Decimal;
}): FinancialHealthResult {
  const liquid = toDecimal(liquidCapital);
  const outflow = toDecimal(monthlyOutflow);
  const assets = toDecimal(totalAssets);
  const liabilities = toDecimal(totalLiabilities);
  const savingsRate = typeof savingsRatePercent === "number" ? savingsRatePercent : parseFloat(savingsRatePercent) || 0;
  const used = toDecimal(creditUsed);
  const limit = toDecimal(totalCreditLimit);

  // Pillar 1: Emergency Liquidity Runway
  let runwayMonths = 6;
  if (outflow.greaterThan(0)) {
    runwayMonths = liquid.dividedBy(outflow).toNumber();
  } else if (liquid.isZero()) {
    runwayMonths = 0;
  }
  let p1Score = 4;
  let p1Status: "optimal" | "moderate" | "warning" = "warning";
  if (runwayMonths >= 6) {
    p1Score = 25;
    p1Status = "optimal";
  } else if (runwayMonths >= 3) {
    p1Score = 18;
    p1Status = "moderate";
  } else if (runwayMonths >= 1) {
    p1Score = 10;
    p1Status = "moderate";
  }

  // Pillar 2: Debt-to-Asset Ratio
  let debtRatio = 0;
  if (assets.greaterThan(0)) {
    debtRatio = liabilities.dividedBy(assets).times(100).toNumber();
  } else if (liabilities.greaterThan(0)) {
    debtRatio = 100;
  }
  let p2Score = 4;
  let p2Status: "optimal" | "moderate" | "warning" = "warning";
  if (debtRatio < 20) {
    p2Score = 25;
    p2Status = "optimal";
  } else if (debtRatio < 40) {
    p2Score = 20;
    p2Status = "optimal";
  } else if (debtRatio < 60) {
    p2Score = 12;
    p2Status = "moderate";
  }

  // Pillar 3: Savings Discipline
  let p3Score = 5;
  let p3Status: "optimal" | "moderate" | "warning" = "warning";
  if (savingsRate >= 30) {
    p3Score = 25;
    p3Status = "optimal";
  } else if (savingsRate >= 20) {
    p3Score = 20;
    p3Status = "optimal";
  } else if (savingsRate >= 10) {
    p3Score = 14;
    p3Status = "moderate";
  }

  // Pillar 4: Credit Utilization
  let creditUtil = 0;
  let p4Score = 25;
  let p4Status: "optimal" | "moderate" | "warning" = "optimal";
  if (limit.greaterThan(0)) {
    creditUtil = used.dividedBy(limit).times(100).toNumber();
    if (creditUtil < 10) {
      p4Score = 25;
      p4Status = "optimal";
    } else if (creditUtil < 30) {
      p4Score = 20;
      p4Status = "optimal";
    } else if (creditUtil < 50) {
      p4Score = 10;
      p4Status = "moderate";
    } else {
      p4Score = 3;
      p4Status = "warning";
    }
  }

  const overallScore = Math.min(100, Math.max(0, p1Score + p2Score + p3Score + p4Score));
  let grade: "Excellent" | "Good" | "Fair" | "Needs Attention" = "Needs Attention";
  let summary = "High leverage or low liquidity reserves require attention.";

  if (overallScore >= 85) {
    grade = "Excellent";
    summary = "Outstanding financial stability, robust liquidity, and disciplined debt control.";
  } else if (overallScore >= 70) {
    grade = "Good";
    summary = "Solid financial foundation with healthy savings and manageable debt levels.";
  } else if (overallScore >= 50) {
    grade = "Fair";
    summary = "Moderate stability; consider boosting emergency liquidity and trimming expenses.";
  }

  return {
    score: overallScore,
    grade,
    summary,
    pillars: [
      {
        name: "Emergency Runway",
        score: p1Score,
        maxScore: 25,
        valueDisplay: `${runwayMonths.toFixed(1)} months`,
        benchmark: "≥ 6 months",
        status: p1Status,
      },
      {
        name: "Debt-to-Asset",
        score: p2Score,
        maxScore: 25,
        valueDisplay: `${debtRatio.toFixed(1)}%`,
        benchmark: "< 30%",
        status: p2Status,
      },
      {
        name: "Savings Rate",
        score: p3Score,
        maxScore: 25,
        valueDisplay: `${savingsRate.toFixed(1)}%`,
        benchmark: "≥ 20%",
        status: p3Status,
      },
      {
        name: "Credit Utilization",
        score: p4Score,
        maxScore: 25,
        valueDisplay: limit.greaterThan(0) ? `${creditUtil.toFixed(1)}%` : "No Cards",
        benchmark: "< 30%",
        status: p4Status,
      },
    ],
  };
}

/**
 * Consolidated Balance Sheet & Net Worth Ratios
 */
export function calculateBalanceSheetRatios({
  liquidBalances,
  investmentValuations = [],
  tangibleAssets = [],
  creditLiabilities = [],
  loanLiabilities = [],
  manualLiabilities = [],
  monthlyExpenses = 0,
}: {
  liquidBalances: (number | string | Decimal)[];
  investmentValuations?: (number | string | Decimal)[];
  tangibleAssets?: (number | string | Decimal)[];
  creditLiabilities?: (number | string | Decimal)[];
  loanLiabilities?: (number | string | Decimal)[];
  manualLiabilities?: (number | string | Decimal)[];
  monthlyExpenses?: number | string | Decimal;
}) {
  let totalLiquid = new Decimal(0);
  for (const b of liquidBalances) totalLiquid = totalLiquid.plus(toDecimal(b));

  let totalInvestments = new Decimal(0);
  for (const inv of investmentValuations) totalInvestments = totalInvestments.plus(toDecimal(inv));

  let totalTangible = new Decimal(0);
  for (const ast of tangibleAssets) totalTangible = totalTangible.plus(toDecimal(ast));

  let totalCredit = new Decimal(0);
  for (const c of creditLiabilities) totalCredit = totalCredit.plus(toDecimal(c));

  let totalLoans = new Decimal(0);
  for (const l of loanLiabilities) totalLoans = totalLoans.plus(toDecimal(l));

  let totalManualLia = new Decimal(0);
  for (const m of manualLiabilities) totalManualLia = totalManualLia.plus(toDecimal(m));

  const totalAssets = totalLiquid.plus(totalInvestments).plus(totalTangible);
  const totalLiabilities = totalCredit.plus(totalLoans).plus(totalManualLia);
  const netWorth = totalAssets.minus(totalLiabilities);

  const liquidNetWorth = totalLiquid.minus(totalCredit);
  const investedNetWorth = totalInvestments;
  const tangibleNetWorth = totalTangible.minus(totalLoans).minus(totalManualLia);

  let debtToAssetRatio = "0.00";
  if (totalAssets.greaterThan(0)) {
    debtToAssetRatio = totalLiabilities.dividedBy(totalAssets).times(100).toFixed(2);
  }

  const exp = toDecimal(monthlyExpenses);
  let liquidityRatio = "0.0";
  if (exp.greaterThan(0)) {
    liquidityRatio = totalLiquid.dividedBy(exp).toFixed(1);
  }

  return {
    totalLiquid: totalLiquid.toFixed(4),
    totalInvestments: totalInvestments.toFixed(4),
    totalTangible: totalTangible.toFixed(4),
    totalAssets: totalAssets.toFixed(4),
    totalLiabilities: totalLiabilities.toFixed(4),
    netWorth: netWorth.toFixed(4),
    liquidNetWorth: liquidNetWorth.toFixed(4),
    investedNetWorth: investedNetWorth.toFixed(4),
    tangibleNetWorth: tangibleNetWorth.toFixed(4),
    debtToAssetRatio,
    liquidityRatio,
  };
}

/**
 * Validate that split allocation items equal the parent transaction total exactly
 */
export function validateSplitAmounts(
  totalAmount: number | string | Decimal,
  splits: Array<{ amount: number | string | Decimal }>
): {
  isValid: boolean;
  totalAllocated: string;
  difference: string;
  remaining: string;
} {
  let sum = new Decimal(0);
  for (const s of splits) {
    sum = sum.plus(toDecimal(s.amount));
  }
  const expected = toDecimal(totalAmount);
  const diff = expected.minus(sum);

  return {
    isValid: diff.abs().lessThan(0.0001),
    totalAllocated: sum.toFixed(4),
    difference: diff.toFixed(4),
    remaining: diff.toFixed(2),
  };
}

/**
 * Calculate the adjustment transaction required to reconcile an account balance
 */
export function calculateReconciliationAdjustment(
  currentBalance: number | string | Decimal,
  actualBalance: number | string | Decimal
): {
  difference: string;
  adjustmentType: "income" | "expense" | "none";
  adjustmentAmount: string;
} {
  const current = toDecimal(currentBalance);
  const actual = toDecimal(actualBalance);
  const diff = actual.minus(current);

  if (diff.abs().lessThan(0.0001)) {
    return {
      difference: "0.0000",
      adjustmentType: "none",
      adjustmentAmount: "0.0000",
    };
  }

  if (diff.isPositive()) {
    return {
      difference: diff.toFixed(4),
      adjustmentType: "income",
      adjustmentAmount: diff.toFixed(4),
    };
  } else {
    return {
      difference: diff.toFixed(4),
      adjustmentType: "expense",
      adjustmentAmount: diff.abs().toFixed(4),
    };
  }
}

/**
 * Get date interval for Indian Financial Year (April 1 to March 31)
 */
export function getIndianFinancialYearInterval(
  referenceDate: Date = new Date(),
  offsetYears: number = 0
): {
  start: Date;
  end: Date;
  label: string;
} {
  const currentMonth = referenceDate.getMonth(); // 0-based: 0 = Jan, 3 = April
  const currentYear = referenceDate.getFullYear();

  // If month is >= April (3), fiscal start year is currentYear, else currentYear - 1
  const baseStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const startYear = baseStartYear + offsetYears;
  const endYear = startYear + 1;

  const start = new Date(startYear, 3, 1, 0, 0, 0, 0); // April 1
  const end = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31

  const label = `FY ${startYear}–${endYear.toString().slice(-2)}`;
  return { start, end, label };
}

export interface FinancialInsightItem {
  id: string;
  type: "positive" | "warning" | "alert" | "neutral";
  title: string;
  description: string;
  metric?: string;
}

export interface DeterministicFinancialInsights {
  liquidRunwayMonths: string;
  topExpenseCategory: { name: string; amount: string; percentage: number } | null;
  highestTransaction: { description: string; amount: string; date: string } | null;
  anomaliesCount: number;
  insights: FinancialInsightItem[];
}

/**
 * Deterministic Insights Engine:
 * Analyzes spending distributions, anomalies, runway, and savings velocity without LLM hallucinations
 */
export function generateDeterministicInsights(
  transactions: Array<{
    amount: number | string | Decimal;
    transaction_type: string;
    transaction_date: string;
    description?: string | null;
    category?: { name: string } | null;
  }>,
  totalLiquidCapital: number | string | Decimal = 0
): DeterministicFinancialInsights {
  let totalIncome = new Decimal(0);
  let totalExpense = new Decimal(0);
  const categoryExpenses: Record<string, Decimal> = {};
  let maxTransaction: { description: string; amount: string; date: string; decimal: Decimal } | null = null;

  for (const t of transactions) {
    const amt = toDecimal(t.amount);
    if (t.transaction_type === "income" || t.transaction_type === "refund") {
      totalIncome = totalIncome.plus(amt);
    } else if (t.transaction_type === "expense") {
      totalExpense = totalExpense.plus(amt);
      const catName = t.category?.name || "Uncategorized";
      categoryExpenses[catName] = (categoryExpenses[catName] || new Decimal(0)).plus(amt);

      if (!maxTransaction || amt.greaterThan(maxTransaction.decimal)) {
        maxTransaction = {
          description: t.description || "Expense",
          amount: amt.toFixed(4),
          date: t.transaction_date,
          decimal: amt,
        };
      }
    }
  }

  // Calculate Liquid Runway
  const liquid = toDecimal(totalLiquidCapital);
  let runwayMonths = "0.0";
  if (totalExpense.greaterThan(0)) {
    runwayMonths = liquid.dividedBy(totalExpense).toFixed(1);
  } else if (liquid.greaterThan(0)) {
    runwayMonths = "12.0+";
  }

  // Top Expense Category
  let topCat: { name: string; amount: string; percentage: number } | null = null;
  const sortedCategories = Object.entries(categoryExpenses).sort((a, b) =>
    b[1].minus(a[1]).toNumber()
  );

  if (sortedCategories.length > 0 && totalExpense.greaterThan(0)) {
    const [name, amount] = sortedCategories[0];
    const pct = Math.round(amount.dividedBy(totalExpense).times(100).toNumber());
    topCat = {
      name,
      amount: amount.toFixed(4),
      percentage: pct,
    };
  }

  // Generate Deterministic Insight Cards
  const insights: FinancialInsightItem[] = [];
  let anomaliesCount = 0;

  // 1. Savings Rate / Cash Flow Insight
  if (totalIncome.greaterThan(0)) {
    const savings = totalIncome.minus(totalExpense);
    const savingsRate = Math.round(savings.dividedBy(totalIncome).times(100).toNumber());

    if (savingsRate >= 30) {
      insights.push({
        id: "savings-optimal",
        type: "positive",
        title: "High Wealth Accumulation Velocity",
        description: `You are saving ${savingsRate}% of your total inflows, which is well above the standard 20% benchmark.`,
        metric: `${savingsRate}% saved`,
      });
    } else if (savingsRate >= 15) {
      insights.push({
        id: "savings-normal",
        type: "neutral",
        title: "Steady Savings Pace",
        description: `Your net savings rate is ${savingsRate}%. Maintaining consistency here continues to build emergency stability.`,
        metric: `${savingsRate}% saved`,
      });
    } else if (savingsRate >= 0) {
      insights.push({
        id: "savings-low",
        type: "warning",
        title: "Sub-optimal Savings Margin",
        description: `Your net savings rate is ${savingsRate}%. Minor spending discipline in discretionary categories can elevate this.`,
        metric: `${savingsRate}% saved`,
      });
    } else {
      anomaliesCount++;
      insights.push({
        id: "savings-deficit",
        type: "alert",
        title: "Cash-Flow Deficit Observed",
        description: `Outflows exceed recorded income by ₹${totalExpense.minus(totalIncome).toFixed(2)}. Review large one-time expenses.`,
        metric: "Negative cash-flow",
      });
    }
  }

  // 2. Emergency Runway Insight
  const runwayNum = parseFloat(runwayMonths);
  if (!isNaN(runwayNum)) {
    if (runwayNum >= 6) {
      insights.push({
        id: "runway-optimal",
        type: "positive",
        title: "Resilient Emergency Runway",
        description: `Liquid reserves cover ${runwayMonths} months of your average outflow, exceeding the recommended 6-month safety net.`,
        metric: `${runwayMonths} mo runway`,
      });
    } else if (runwayNum >= 3) {
      insights.push({
        id: "runway-moderate",
        type: "neutral",
        title: "Moderate Emergency Buffer",
        description: `Current liquid capital provides ${runwayMonths} months of burn. Aim to scale this towards 6 full months.`,
        metric: `${runwayMonths} mo runway`,
      });
    } else if (totalExpense.greaterThan(0)) {
      anomaliesCount++;
      insights.push({
        id: "runway-alert",
        type: "alert",
        title: "Low Liquidity Coverage",
        description: `Available liquid cash covers only ${runwayMonths} months of expenses. Prioritize emergency fund replenishment.`,
        metric: `${runwayMonths} mo runway`,
      });
    }
  }

  // 3. Category Concentration / Anomaly Insight
  if (topCat && topCat.percentage >= 35) {
    anomaliesCount++;
    insights.push({
      id: "cat-concentration",
      type: "warning",
      title: `High Concentration in ${topCat.name}`,
      description: `${topCat.name} accounts for ${topCat.percentage}% of your entire expenditure this period.`,
      metric: `${topCat.percentage}% of total`,
    });
  }

  // 4. Large Outflow Anomaly
  if (maxTransaction && totalExpense.greaterThan(0)) {
    const singlePct = Math.round(maxTransaction.decimal.dividedBy(totalExpense).times(100).toNumber());
    if (singlePct >= 25 && transactions.length >= 3) {
      anomaliesCount++;
      insights.push({
        id: "single-large-txn",
        type: "warning",
        title: "Significant Single Outflow Detected",
        description: `"${maxTransaction.description}" was your highest expense, taking up ${singlePct}% of total outflows.`,
        metric: `${singlePct}% of spend`,
      });
    }
  }

  return {
    liquidRunwayMonths: runwayMonths,
    topExpenseCategory: topCat,
    highestTransaction: maxTransaction ? {
      description: maxTransaction.description,
      amount: maxTransaction.amount,
      date: maxTransaction.date,
    } : null,
    anomaliesCount,
    insights,
  };
}

export interface SafeToSpendParams {
  liquidBalances: (string | number | Decimal)[];
  creditLiabilities?: (string | number | Decimal)[];
  monthlySpent: string | number | Decimal;
  activeBudgetLimit?: string | number | Decimal | null;
  upcomingBills?: (string | number | Decimal)[];
  reservedSavings?: (string | number | Decimal)[];
  daysRemainingInMonth?: number;
}

export interface SafeToSpendResult {
  safeToSpendToday: string;
  safeRemainingPool: string;
  totalLiquidAvailable: string;
  remainingBudget: string;
  amountSpentThisMonth: string;
  upcomingCommitments: string;
  daysRemaining: number;
  paceStatus: "ahead" | "on_track" | "caution" | "depleted";
  healthScore: number;
  pacingPercentage: number;
}

/**
 * Calculates Leftovers-inspired "Safe to Spend Today" with strict Decimal precision.
 * Considers available liquid net cash, active budget remaining, upcoming bills/EMIs,
 * and remaining days in the cycle.
 */
export function calculateSafeToSpend(params: SafeToSpendParams): SafeToSpendResult {
  // 1. Total liquid assets
  let liquidTotal = new Decimal(0);
  for (const b of params.liquidBalances) {
    liquidTotal = liquidTotal.plus(toDecimal(b));
  }

  // 2. Subtract credit liabilities (short term)
  let creditTotal = new Decimal(0);
  if (params.creditLiabilities) {
    for (const c of params.creditLiabilities) {
      creditTotal = creditTotal.plus(toDecimal(c));
    }
  }
  const netLiquid = Decimal.max(0, liquidTotal.minus(creditTotal));

  // 3. Upcoming commitments before month end
  let commitments = new Decimal(0);
  if (params.upcomingBills) {
    for (const bill of params.upcomingBills) {
      commitments = commitments.plus(toDecimal(bill));
    }
  }

  // 4. Reserved savings
  let reserved = new Decimal(0);
  if (params.reservedSavings) {
    for (const res of params.reservedSavings) {
      reserved = reserved.plus(toDecimal(res));
    }
  }

  // 5. Amount spent this month
  const spentThisMonth = toDecimal(params.monthlySpent);

  // 6. Remaining budget calculation
  let remainingBudget = new Decimal(0);
  let safePool = new Decimal(0);
  const budgetLimit = params.activeBudgetLimit ? toDecimal(params.activeBudgetLimit) : null;

  if (budgetLimit && budgetLimit.greaterThan(0)) {
    remainingBudget = Decimal.max(0, budgetLimit.minus(spentThisMonth));
    // Safe pool is capped by both remaining budget and actual liquid cash
    safePool = Decimal.max(
      0,
      Decimal.min(remainingBudget.minus(commitments), netLiquid.minus(commitments))
    );
  } else {
    // If no explicit budget set, use liquid capital buffer
    remainingBudget = Decimal.max(0, netLiquid.minus(commitments).minus(reserved));
    safePool = remainingBudget;
  }

  // 7. Days remaining
  const days = Math.max(1, params.daysRemainingInMonth ?? 1);
  const safeToday = safePool.dividedBy(days);

  // 8. Pacing status & health score
  let paceStatus: "ahead" | "on_track" | "caution" | "depleted" = "on_track";
  let healthScore = 75;

  if (safePool.lessThanOrEqualTo(0)) {
    paceStatus = "depleted";
    healthScore = 20;
  } else if (budgetLimit && budgetLimit.greaterThan(0)) {
    const budgetNum = budgetLimit.toNumber();
    const spentNum = spentThisMonth.toNumber();
    const ratio = budgetNum > 0 ? spentNum / budgetNum : 0;
    if (ratio >= 0.9) {
      paceStatus = "caution";
      healthScore = 45;
    } else if (ratio <= 0.6) {
      paceStatus = "ahead";
      healthScore = 95;
    } else {
      paceStatus = "on_track";
      healthScore = 80;
    }
  } else {
    if (safeToday.toNumber() > 1000) {
      paceStatus = "ahead";
      healthScore = 90;
    } else if (safeToday.toNumber() < 300) {
      paceStatus = "caution";
      healthScore = 50;
    }
  }

  const budgetNum = budgetLimit && budgetLimit.greaterThan(0) ? budgetLimit.toNumber() : netLiquid.toNumber();
  const pacingPercentage = budgetNum > 0
    ? Math.min(100, Math.round((spentThisMonth.toNumber() / budgetNum) * 100))
    : 0;

  return {
    safeToSpendToday: safeToday.toFixed(2),
    safeRemainingPool: safePool.toFixed(2),
    totalLiquidAvailable: netLiquid.toFixed(2),
    remainingBudget: remainingBudget.toFixed(2),
    amountSpentThisMonth: spentThisMonth.toFixed(2),
    upcomingCommitments: commitments.toFixed(2),
    daysRemaining: days,
    paceStatus,
    healthScore,
    pacingPercentage,
  };
}


