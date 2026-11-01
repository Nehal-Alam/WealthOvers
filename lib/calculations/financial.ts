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

