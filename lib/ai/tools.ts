/**
 * WEALTHOVERS V2: AI Read-Only Financial Analysis Tools
 * Phase 5: Provider-Independent Cloud AI Gateway
 *
 * All tools are strictly read-only, parameterized, and scoped to the authenticated user ID.
 * Arbitrary SQL and mutations are completely prevented by design.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import { maskAccountNumber } from "./sanitizer";

export interface SpendingBreakdownItem {
  category: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
}

export interface SpendingBreakdownResult {
  periodDays: number;
  totalExpenses: number;
  categories: SpendingBreakdownItem[];
  topExpenseCategory: string;
}

export interface NetWorthSummaryResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidNetWorth: number;
  breakdown: {
    cashAndBank: number;
    investments: number;
    fixedAssets: number;
    creditCards: number;
    loans: number;
    externalLiabilities: number;
  };
}

export interface PortfolioBreakdownResult {
  totalInvested: number;
  currentValuation: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  byAssetType: Array<{
    assetType: string;
    totalInvested: number;
    currentValuation: number;
    allocationPercentage: number;
    pnl: number;
  }>;
}

export interface LoanSimulationResult {
  loanId: string;
  lenderName: string;
  principalAmount: number;
  currentOutstanding: number;
  annualInterestRate: number;
  tenureMonths: number;
  currentEmi: number;
  extraMonthlyPayment: number;
  revisedTenureMonths: number;
  monthsSaved: number;
  totalInterestOriginal: number;
  totalInterestRevised: number;
  interestSaved: number;
}

export interface CashFlowForecastResult {
  averageMonthlyIncome: number;
  fixedMonthlyCommitments: number;
  averageMonthlyExpenses: number;
  projectedMonthlySurplus: number;
  forecastMonths: number;
  projections: Array<{
    monthIndex: number;
    projectedIncome: number;
    projectedOutflow: number;
    projectedSurplus: number;
    cumulativeSurplus: number;
  }>;
}

/**
 * Tool 1: getSpendingBreakdown
 */
export async function getSpendingBreakdown(
  supabase: SupabaseClient,
  userId: string,
  days: number = 30
): Promise<SpendingBreakdownResult> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceIso = sinceDate.toISOString();

  const { data: txs, error } = await supabase
    .from("transactions")
    .select("amount, type, category:categories(name)")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("transaction_date", sinceIso);

  if (error || !txs) {
    return {
      periodDays: days,
      totalExpenses: 0,
      categories: [],
      topExpenseCategory: "None",
    };
  }

  const categoryMap = new Map<string, { total: Decimal; count: number }>();
  let totalExpenses = new Decimal(0);

  for (const tx of txs) {
    const amt = new Decimal(tx.amount || 0);
    totalExpenses = totalExpenses.plus(amt);

    const catName =
      (tx.category as any)?.name || "Uncategorized";
    const existing = categoryMap.get(catName) || { total: new Decimal(0), count: 0 };
    existing.total = existing.total.plus(amt);
    existing.count += 1;
    categoryMap.set(catName, existing);
  }

  const totalNum = totalExpenses.toNumber();
  const categories: SpendingBreakdownItem[] = Array.from(categoryMap.entries())
    .map(([category, stats]) => {
      const catTotal = stats.total.toNumber();
      const pct = totalNum > 0 ? (catTotal / totalNum) * 100 : 0;
      return {
        category,
        totalAmount: Number(catTotal.toFixed(2)),
        percentage: Number(pct.toFixed(2)),
        transactionCount: stats.count,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    periodDays: days,
    totalExpenses: Number(totalNum.toFixed(2)),
    categories,
    topExpenseCategory: categories[0]?.category || "None",
  };
}

/**
 * Tool 2: getNetWorthSummary
 */
export async function getNetWorthSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<NetWorthSummaryResult> {
  // Accounts (Cash / Bank / Savings)
  const { data: accounts } = await supabase
    .from("accounts")
    .select("account_type, current_balance, is_archived")
    .eq("user_id", userId)
    .eq("is_archived", false);

  let cashAndBank = new Decimal(0);
  if (accounts) {
    for (const acc of accounts) {
      if (acc.account_type !== "credit_card") {
        cashAndBank = cashAndBank.plus(new Decimal(acc.current_balance || 0));
      }
    }
  }

  // Credit Cards
  const { data: creditCards } = await supabase
    .from("credit_cards")
    .select("current_outstanding")
    .eq("user_id", userId);

  let creditCardsTotal = new Decimal(0);
  if (creditCards) {
    for (const cc of creditCards) {
      creditCardsTotal = creditCardsTotal.plus(new Decimal(cc.current_outstanding || 0));
    }
  }

  // Investments
  const { data: investments } = await supabase
    .from("investments")
    .select("current_valuation")
    .eq("user_id", userId);

  let investmentsTotal = new Decimal(0);
  if (investments) {
    for (const inv of investments) {
      investmentsTotal = investmentsTotal.plus(new Decimal(inv.current_valuation || 0));
    }
  }

  // Fixed Assets
  const { data: assets } = await supabase
    .from("assets")
    .select("current_valuation")
    .eq("user_id", userId);

  let assetsTotal = new Decimal(0);
  if (assets) {
    for (const a of assets) {
      assetsTotal = assetsTotal.plus(new Decimal(a.current_valuation || 0));
    }
  }

  // Loans
  const { data: loans } = await supabase
    .from("loans")
    .select("outstanding_balance")
    .eq("user_id", userId);

  let loansTotal = new Decimal(0);
  if (loans) {
    for (const l of loans) {
      loansTotal = loansTotal.plus(new Decimal(l.outstanding_balance || 0));
    }
  }

  // External Liabilities
  const { data: liabilities } = await supabase
    .from("liabilities")
    .select("outstanding_amount")
    .eq("user_id", userId);

  let liabilitiesTotal = new Decimal(0);
  if (liabilities) {
    for (const liab of liabilities) {
      liabilitiesTotal = liabilitiesTotal.plus(new Decimal(liab.outstanding_amount || 0));
    }
  }

  const totalAssets = cashAndBank.plus(investmentsTotal).plus(assetsTotal);
  const totalLiabilities = creditCardsTotal.plus(loansTotal).plus(liabilitiesTotal);
  const netWorth = totalAssets.minus(totalLiabilities);
  const liquidNetWorth = cashAndBank.minus(creditCardsTotal);

  return {
    totalAssets: Number(totalAssets.toFixed(2)),
    totalLiabilities: Number(totalLiabilities.toFixed(2)),
    netWorth: Number(netWorth.toFixed(2)),
    liquidNetWorth: Number(liquidNetWorth.toFixed(2)),
    breakdown: {
      cashAndBank: Number(cashAndBank.toFixed(2)),
      investments: Number(investmentsTotal.toFixed(2)),
      fixedAssets: Number(assetsTotal.toFixed(2)),
      creditCards: Number(creditCardsTotal.toFixed(2)),
      loans: Number(loansTotal.toFixed(2)),
      externalLiabilities: Number(liabilitiesTotal.toFixed(2)),
    },
  };
}

/**
 * Tool 3: getPortfolioBreakdown
 */
export async function getPortfolioBreakdown(
  supabase: SupabaseClient,
  userId: string
): Promise<PortfolioBreakdownResult> {
  const { data: investments } = await supabase
    .from("investments")
    .select("asset_type, total_invested_amount, current_valuation")
    .eq("user_id", userId);

  if (!investments || investments.length === 0) {
    return {
      totalInvested: 0,
      currentValuation: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercentage: 0,
      byAssetType: [],
    };
  }

  let grandInvested = new Decimal(0);
  let grandValuation = new Decimal(0);
  const groupMap = new Map<string, { invested: Decimal; valuation: Decimal }>();

  for (const inv of investments) {
    const invAmt = new Decimal(inv.total_invested_amount || 0);
    const valAmt = new Decimal(inv.current_valuation || 0);
    grandInvested = grandInvested.plus(invAmt);
    grandValuation = grandValuation.plus(valAmt);

    const typeKey = inv.asset_type || "other";
    const group = groupMap.get(typeKey) || { invested: new Decimal(0), valuation: new Decimal(0) };
    group.invested = group.invested.plus(invAmt);
    group.valuation = group.valuation.plus(valAmt);
    groupMap.set(typeKey, group);
  }

  const grandValuationNum = grandValuation.toNumber();
  const grandInvestedNum = grandInvested.toNumber();
  const grandPnL = grandValuation.minus(grandInvested);
  const grandPnLPct = grandInvestedNum > 0 ? (grandPnL.toNumber() / grandInvestedNum) * 100 : 0;

  const byAssetType = Array.from(groupMap.entries()).map(([assetType, vals]) => {
    const valNum = vals.valuation.toNumber();
    const invNum = vals.invested.toNumber();
    const alloc = grandValuationNum > 0 ? (valNum / grandValuationNum) * 100 : 0;
    return {
      assetType,
      totalInvested: Number(invNum.toFixed(2)),
      currentValuation: Number(valNum.toFixed(2)),
      allocationPercentage: Number(alloc.toFixed(2)),
      pnl: Number((valNum - invNum).toFixed(2)),
    };
  });

  return {
    totalInvested: Number(grandInvestedNum.toFixed(2)),
    currentValuation: Number(grandValuationNum.toFixed(2)),
    unrealizedPnL: Number(grandPnL.toFixed(2)),
    unrealizedPnLPercentage: Number(grandPnLPct.toFixed(2)),
    byAssetType,
  };
}

/**
 * Tool 4: simulateLoanPrepayment
 */
export async function simulateLoanPrepayment(
  supabase: SupabaseClient,
  userId: string,
  loanId: string,
  extraMonthlyPayment: number
): Promise<LoanSimulationResult | null> {
  const { data: loan, error } = await supabase
    .from("loans")
    .select("id, lender_or_borrower_name, principal_amount, outstanding_balance, annual_interest_rate, tenure_months, monthly_emi")
    .eq("id", loanId)
    .eq("user_id", userId)
    .single();

  if (error || !loan) {
    return null;
  }

  const P = new Decimal(loan.outstanding_balance || loan.principal_amount);
  const annualR = new Decimal(loan.annual_interest_rate).div(100);
  const r = annualR.div(12);
  const emi = new Decimal(loan.monthly_emi);
  const extra = new Decimal(Math.max(0, extraMonthlyPayment));
  const newEmi = emi.plus(extra);

  let balance = P;
  let monthsOriginal = 0;
  let totalInterestOriginal = new Decimal(0);

  // Simulate original schedule
  while (balance.greaterThan(0) && monthsOriginal < 480) {
    monthsOriginal++;
    const interest = balance.times(r);
    totalInterestOriginal = totalInterestOriginal.plus(interest);
    const principalPaid = emi.minus(interest);
    if (principalPaid.lessThanOrEqualTo(0)) break; // EMI does not cover interest
    balance = balance.minus(principalPaid);
  }

  // Simulate revised schedule with extra prepayment
  let balanceRevised = P;
  let monthsRevised = 0;
  let totalInterestRevised = new Decimal(0);

  while (balanceRevised.greaterThan(0) && monthsRevised < 480) {
    monthsRevised++;
    const interest = balanceRevised.times(r);
    totalInterestRevised = totalInterestRevised.plus(interest);
    const principalPaid = newEmi.minus(interest);
    if (principalPaid.lessThanOrEqualTo(0)) break;
    balanceRevised = balanceRevised.minus(principalPaid);
  }

  const interestSaved = totalInterestOriginal.minus(totalInterestRevised);
  const monthsSaved = Math.max(0, monthsOriginal - monthsRevised);

  return {
    loanId: loan.id,
    lenderName: loan.lender_or_borrower_name,
    principalAmount: Number(new Decimal(loan.principal_amount).toFixed(2)),
    currentOutstanding: Number(P.toFixed(2)),
    annualInterestRate: Number(annualR.times(100).toFixed(2)),
    tenureMonths: loan.tenure_months,
    currentEmi: Number(emi.toFixed(2)),
    extraMonthlyPayment: Number(extra.toFixed(2)),
    revisedTenureMonths: monthsRevised,
    monthsSaved,
    totalInterestOriginal: Number(totalInterestOriginal.toFixed(2)),
    totalInterestRevised: Number(totalInterestRevised.toFixed(2)),
    interestSaved: Number(interestSaved.toFixed(2)),
  };
}

/**
 * Tool 5: forecastCashFlow
 */
export async function forecastCashFlow(
  supabase: SupabaseClient,
  userId: string,
  forecastMonths: number = 6
): Promise<CashFlowForecastResult> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Income transactions in last 90 days
  const { data: incomeTxs } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("type", "income")
    .gte("transaction_date", ninetyDaysAgo.toISOString());

  // Expense transactions in last 90 days
  const { data: expenseTxs } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("transaction_date", ninetyDaysAgo.toISOString());

  // Subscriptions & EMIs (monthly commitments)
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("amount, billing_cycle")
    .eq("user_id", userId)
    .eq("status", "active");

  const { data: loans } = await supabase
    .from("loans")
    .select("monthly_emi")
    .eq("user_id", userId)
    .gt("outstanding_balance", 0);

  let totalIncome90 = new Decimal(0);
  if (incomeTxs) {
    for (const t of incomeTxs) totalIncome90 = totalIncome90.plus(new Decimal(t.amount || 0));
  }
  const avgMonthlyIncome = totalIncome90.div(3);

  let totalExpense90 = new Decimal(0);
  if (expenseTxs) {
    for (const t of expenseTxs) totalExpense90 = totalExpense90.plus(new Decimal(t.amount || 0));
  }
  const avgMonthlyExpense = totalExpense90.div(3);

  let fixedCommitments = new Decimal(0);
  if (subscriptions) {
    for (const s of subscriptions) {
      const amt = new Decimal(s.amount || 0);
      if (s.billing_cycle === "monthly") fixedCommitments = fixedCommitments.plus(amt);
      else if (s.billing_cycle === "yearly") fixedCommitments = fixedCommitments.plus(amt.div(12));
      else if (s.billing_cycle === "quarterly") fixedCommitments = fixedCommitments.plus(amt.div(3));
    }
  }

  if (loans) {
    for (const l of loans) {
      fixedCommitments = fixedCommitments.plus(new Decimal(l.monthly_emi || 0));
    }
  }

  // Monthly outflow estimate: maximum of average expenses or fixed commitments
  const projectedMonthlyOutflow = Decimal.max(avgMonthlyExpense, fixedCommitments);
  const projectedSurplus = avgMonthlyIncome.minus(projectedMonthlyOutflow);

  let cumulative = new Decimal(0);
  const projections = [];

  for (let m = 1; m <= forecastMonths; m++) {
    cumulative = cumulative.plus(projectedSurplus);
    projections.push({
      monthIndex: m,
      projectedIncome: Number(avgMonthlyIncome.toFixed(2)),
      projectedOutflow: Number(projectedMonthlyOutflow.toFixed(2)),
      projectedSurplus: Number(projectedSurplus.toFixed(2)),
      cumulativeSurplus: Number(cumulative.toFixed(2)),
    });
  }

  return {
    averageMonthlyIncome: Number(avgMonthlyIncome.toFixed(2)),
    fixedMonthlyCommitments: Number(fixedCommitments.toFixed(2)),
    averageMonthlyExpenses: Number(avgMonthlyExpense.toFixed(2)),
    projectedMonthlySurplus: Number(projectedSurplus.toFixed(2)),
    forecastMonths,
    projections,
  };
}

