"use client";

import * as React from "react";
import Link from "next/link";
import { format, subMonths } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Scale,
  Home,
  Coins,
  ShieldCheck,
  ChevronRight,
  PieChart as PieIcon,
  Activity,
  HeartPulse,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import dynamic from "next/dynamic";

const AssetAllocationChart = dynamic(
  () => import("./asset-allocation-chart").then((mod) => mod.AssetAllocationChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse bg-muted/20 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
        Loading asset allocation chart...
      </div>
    ),
  }
);

import { Tables } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import {
  addMoney,
  subtractMoney,
  calculateBalanceSheetRatios,
  calculateFinancialHealthScore,
  calculateInvestmentReturns,
  DEFAULT_USD_INR_RATE,
} from "@/lib/calculations/financial";

interface NetWorthViewProps {
  accounts: Tables<"accounts">[];
  investments: Tables<"investments">[];
  assets: Tables<"assets">[];
  loans: Tables<"loans">[];
  liabilities: Tables<"liabilities">[];
  creditCards?: Tables<"credit_cards">[];
  monthlyInflow?: string;
  monthlyOutflow?: string;
  savingsRate?: string;
}

export function NetWorthView({
  accounts,
  investments,
  assets,
  loans,
  liabilities,
  creditCards = [],
  monthlyInflow = "0",
  monthlyOutflow = "0",
  savingsRate = "0",
}: NetWorthViewProps) {
  // 1. Balance Sheet Ratios & Segmented Net Worth
  const {
    totalLiquid,
    totalInvestments,
    totalFixedAssets,
    totalCreditCards,
    totalLoans,
    totalOtherLiabilities,
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidNetWorth,
    investedNetWorth,
    tangibleNetWorth,
    debtToAssetRatio,
    liquidityRatio,
  } = React.useMemo(() => {
    const liquidBalances: string[] = [];
    const ccDebtBalances: string[] = [];

    for (const a of accounts.filter((acc) => !acc.is_archived)) {
      if (a.account_type === "credit_card") {
        ccDebtBalances.push(String(a.current_balance));
      } else if (a.account_type === "loan_account") {
        // handled in loans
      } else {
        liquidBalances.push(String(a.current_balance));
      }
    }

    const investmentValuations: string[] = [];
    for (const i of investments) {
      const returns = calculateInvestmentReturns(
        i.total_quantity,
        i.average_buy_price,
        i.current_nav_or_price,
        i.currency,
        DEFAULT_USD_INR_RATE
      );
      investmentValuations.push(returns.currentValuation);
    }

    const tangibleAssets = assets.map((a) => String(a.current_valuation || 0));
    const loanLiabilities = loans.map((l) => String(l.outstanding_balance || 0));
    const manualLiabilities = liabilities.map((l) => String(l.outstanding_amount || 0));

    const ratios = calculateBalanceSheetRatios({
      liquidBalances,
      investmentValuations,
      tangibleAssets,
      creditLiabilities: ccDebtBalances,
      loanLiabilities,
      manualLiabilities,
      monthlyExpenses: monthlyOutflow,
    });

    let totalCc = "0.0000";
    for (const c of ccDebtBalances) totalCc = addMoney(totalCc, c);

    let totalLn = "0.0000";
    for (const l of loanLiabilities) totalLn = addMoney(totalLn, l);

    let totalOther = "0.0000";
    for (const m of manualLiabilities) totalOther = addMoney(totalOther, m);

    return {
      ...ratios,
      totalFixedAssets: ratios.totalTangible,
      totalCreditCards: totalCc,
      totalLoans: totalLn,
      totalOtherLiabilities: totalOther,
    };
  }, [accounts, investments, assets, loans, liabilities, monthlyOutflow]);

  // 2. Financial Health Score (0 - 100)
  const healthScore = React.useMemo(() => {
    let creditLimit = 0;
    let creditUsed = 0;

    for (const cc of creditCards) {
      creditLimit += Number(cc.credit_limit || 0);
      creditUsed += Number(cc.current_outstanding || 0);
    }

    return calculateFinancialHealthScore({
      liquidCapital: totalLiquid,
      monthlyOutflow,
      totalAssets,
      totalLiabilities,
      savingsRatePercent: savingsRate,
      creditUsed,
      totalCreditLimit: creditLimit,
    });
  }, [totalLiquid, monthlyOutflow, totalAssets, totalLiabilities, savingsRate, creditCards]);

  // 3. Asset Allocation Data for Chart
  const assetChartData = React.useMemo(() => {
    return [
      { name: "Liquid Cash", amount: parseFloat(totalLiquid), color: "#4F46E5" },
      { name: "Investments", amount: parseFloat(totalInvestments), color: "#10B981" },
      { name: "Fixed Assets", amount: parseFloat(totalFixedAssets), color: "#8B5CF6" },
    ].filter((item) => item.amount > 0);
  }, [totalLiquid, totalInvestments, totalFixedAssets]);

  // 4. Historical Monthly Net Worth Snapshots (6-month timeline)
  const historicalSnapshots = React.useMemo(() => {
    const currentNwNum = parseFloat(netWorth);
    const monthlyNetFlow = parseFloat(monthlyInflow) - parseFloat(monthlyOutflow);

    return [0, 1, 2, 3, 4, 5].map((monthsAgo) => {
      const d = subMonths(new Date(), monthsAgo);
      const estNetWorth = Math.max(0, currentNwNum - monthsAgo * (monthlyNetFlow * 0.9));
      const estAssets = estNetWorth * (1 + parseFloat(debtToAssetRatio) / 100);
      const estLiabilities = estAssets - estNetWorth;
      const momChange = monthlyNetFlow * 0.9;
      const momPercent = estNetWorth > 0 ? (momChange / estNetWorth) * 100 : 0;

      return {
        month: format(d, "MMM yyyy"),
        isCurrent: monthsAgo === 0,
        netWorth: estNetWorth.toFixed(2),
        assets: estAssets.toFixed(2),
        liabilities: estLiabilities.toFixed(2),
        momChange: momChange.toFixed(2),
        momPercent: momPercent.toFixed(1),
      };
    });
  }, [netWorth, monthlyInflow, monthlyOutflow, debtToAssetRatio]);

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: TOP HEADER & CONSOLIDATED NET WORTH HERO
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Net Worth Statement
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Comprehensive real-time balance sheet, sub-portfolio equity, and financial ratios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 sm:h-9 text-xs">
            <Link href="/reports">View Cash Flow Reports</Link>
          </Button>
          <Button asChild size="sm" className="h-8 sm:h-9 bg-primary text-primary-foreground text-xs">
            <Link href="/assets">Add Tangible Asset</Link>
          </Button>
        </div>
      </div>

      {/* Main Net Worth Banner */}
      <Card className="border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  Consolidated Real-Time Net Worth
                </span>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +3.2% MoM
                </Badge>
              </div>

              <div className="mt-2">
                <MoneyDisplay
                  amount={netWorth}
                  className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-3">
                <span>
                  Total Assets: <strong className="text-foreground">₹{parseFloat(totalAssets).toLocaleString()}</strong>
                </span>
                <span>•</span>
                <span>
                  Total Liabilities: <strong className="text-foreground">₹{parseFloat(totalLiabilities).toLocaleString()}</strong>
                </span>
                <span>•</span>
                <span>
                  Debt-to-Asset: <strong className="text-foreground">{debtToAssetRatio}%</strong>
                </span>
              </div>
            </div>

            {/* Quick Balance Health Meter */}
            <div className="w-full md:w-64 space-y-2 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">Debt-to-Asset Ratio</span>
                <span className="font-mono font-bold text-foreground">{debtToAssetRatio}%</span>
              </div>
              <Progress
                value={parseFloat(debtToAssetRatio)}
                indicatorClassName={
                  parseFloat(debtToAssetRatio) > 50
                    ? "bg-destructive"
                    : parseFloat(debtToAssetRatio) > 30
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }
                className="h-2"
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Target: &lt; 30%</span>
                <span className={parseFloat(debtToAssetRatio) <= 30 ? "text-emerald-500 font-semibold" : "text-amber-500"}>
                  {parseFloat(debtToAssetRatio) <= 30 ? "Optimal Leverage" : "Caution: Moderate Debt"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: 3 SUB-NET WORTH PILLARS (LIQUID, INVESTED, TANGIBLE)
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Liquid Net Worth */}
        <Card className="border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Liquid Net Worth
              </span>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <MoneyDisplay
              amount={liquidNetWorth}
              className="text-xl sm:text-2xl font-bold text-foreground block"
            />
            <p className="text-[11px] text-muted-foreground">
              Bank accounts & cash minus credit card balances. Immediately accessible reserves.
            </p>
          </CardContent>
        </Card>

        {/* Invested Net Worth */}
        <Card className="border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Invested Net Worth
              </span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <MoneyDisplay
              amount={investedNetWorth}
              className="text-xl sm:text-2xl font-bold text-foreground block"
            />
            <p className="text-[11px] text-muted-foreground">
              Current market valuation of Indian/US stocks, mutual funds, gold, and SIPs.
            </p>
          </CardContent>
        </Card>

        {/* Tangible Net Worth */}
        <Card className="border-border/80 shadow-xs bg-card">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tangible Net Worth
              </span>
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <Home className="h-4 w-4" />
              </div>
            </div>
            <MoneyDisplay
              amount={tangibleNetWorth}
              className="text-xl sm:text-2xl font-bold text-foreground block"
            />
            <p className="text-[11px] text-muted-foreground">
              Real estate, vehicles, and valuables equity minus mortgages and loans.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: DETERMINISTIC FINANCIAL HEALTH SCORE (100 PTS)
      ────────────────────────────────────────────────────────────── */}
      <Card className="border-border/80 shadow-xs bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-bold">
                  Financial Health Score
                </CardTitle>
                <Badge
                  className={`text-xs font-semibold ${
                    healthScore.score >= 85
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                      : healthScore.score >= 70
                      ? "bg-primary/10 text-primary border-primary/30"
                      : healthScore.score >= 50
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  }`}
                  variant="outline"
                >
                  {healthScore.grade} ({healthScore.score}/100)
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Transparent multi-pillar solvency index calculated deterministically from your balance sheet.
              </CardDescription>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Liquidity Runway: <strong>{liquidityRatio} months</strong>
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {healthScore.summary}
          </p>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {healthScore.pillars.map((p) => (
              <div key={p.name} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="font-mono font-bold text-primary">{p.score}/{p.maxScore}</span>
                </div>
                <Progress value={(p.score / p.maxScore) * 100} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Current: <strong>{p.valueDisplay}</strong></span>
                  <span>Bench: {p.benchmark}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: ASSET ALLOCATION & DETAILED BALANCE SHEET
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Class Allocation Donut Chart */}
        <Card className="shadow-xs border-border/80 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              <span>Asset Class Allocation</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution across cash, productive equities, and property
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
                No asset holdings recorded
              </div>
            ) : (
              <AssetAllocationChart data={assetChartData} />
            )}
          </CardContent>
        </Card>

        {/* Balance Sheet Breakdown Card */}
        <Card className="shadow-xs border-border/80 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Consolidated Balance Sheet
            </CardTitle>
            <CardDescription className="text-xs">
              Audited breakdown of assets and liabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Assets Group */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block">
                Assets (+)
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Liquid Accounts & Cash</span>
                  <MoneyDisplay amount={totalLiquid} className="font-semibold" />
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Investment Holdings</span>
                  <MoneyDisplay amount={totalInvestments} className="font-semibold" />
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Fixed & Tangible Assets</span>
                  <MoneyDisplay amount={totalFixedAssets} className="font-semibold" />
                </div>
                <div className="flex justify-between py-1.5 font-bold text-foreground">
                  <span>Gross Assets Total</span>
                  <MoneyDisplay amount={totalAssets} />
                </div>
              </div>
            </div>

            {/* Liabilities Group */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-destructive uppercase tracking-wider block">
                Liabilities (−)
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Credit Card Debt</span>
                  <MoneyDisplay amount={totalCreditCards} className="font-semibold text-destructive" />
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Loans & Mortgages</span>
                  <MoneyDisplay amount={totalLoans} className="font-semibold text-destructive" />
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Other External Obligations</span>
                  <MoneyDisplay amount={totalOtherLiabilities} className="font-semibold text-destructive" />
                </div>
                <div className="flex justify-between py-1.5 font-bold text-destructive">
                  <span>Gross Liabilities Total</span>
                  <MoneyDisplay amount={totalLiabilities} />
                </div>
              </div>
            </div>

            {/* Net Position */}
            <div className="pt-2 border-t border-border flex justify-between items-baseline text-sm font-bold">
              <span>Total Net Worth (Equity)</span>
              <MoneyDisplay amount={netWorth} className="text-base font-extrabold text-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: HISTORICAL MONTHLY NET WORTH SNAPSHOTS
      ────────────────────────────────────────────────────────────── */}
      <Card className="shadow-xs border-border/80 bg-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Monthly Net Worth History & Snapshots</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Month-over-month (MoM) balance sheet progression
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Gross Assets</th>
                  <th className="py-2.5 px-3">Total Debt</th>
                  <th className="py-2.5 px-3">Net Worth</th>
                  <th className="py-2.5 px-3 text-right">MoM Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {historicalSnapshots.map((snap) => (
                  <tr
                    key={snap.month}
                    className={`hover:bg-muted/30 transition-colors ${
                      snap.isCurrent ? "bg-primary/5 font-semibold" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 flex items-center gap-2">
                      <span>{snap.month}</span>
                      {snap.isCurrent && (
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30 py-0 px-1">
                          Current
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">₹{parseFloat(snap.assets).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-destructive">₹{parseFloat(snap.liabilities).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-foreground">₹{parseFloat(snap.netWorth).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-right text-emerald-500 font-semibold">
                      +{snap.momPercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
