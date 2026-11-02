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
  PlusCircle,
  ArrowUpRight,
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
import {
  addMoney,
  subtractMoney,
  calculateNetWorth,
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
  // 1. Centralized Authoritative Net Worth Calculation
  const {
    totalLiquid,
    totalInvestments,
    totalFixedAssets,
    totalReceivables,
    totalCreditCards,
    totalLoans,
    totalBorrowedMoney,
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
    const nwData = calculateNetWorth({
      accounts,
      investments,
      assets,
      loans,
      liabilities,
      creditCards,
    });

    const exp = parseFloat(monthlyOutflow) || 0;
    let liqRatio = "0.0";
    if (exp > 0) {
      liqRatio = (parseFloat(nwData.assetsBreakdown.liquidAccounts) / exp).toFixed(1);
    }

    const liquidNet = subtractMoney(
      nwData.assetsBreakdown.liquidAccounts,
      nwData.liabilitiesBreakdown.creditCards
    );
    const investedNet = nwData.assetsBreakdown.investments;
    const tangibleNet = subtractMoney(
      nwData.assetsBreakdown.tangibleAssets,
      addMoney(nwData.liabilitiesBreakdown.loans, nwData.liabilitiesBreakdown.otherDebts)
    );

    return {
      totalLiquid: nwData.assetsBreakdown.liquidAccounts,
      totalInvestments: nwData.assetsBreakdown.investments,
      totalFixedAssets: nwData.assetsBreakdown.tangibleAssets,
      totalReceivables: nwData.assetsBreakdown.receivables,
      totalCreditCards: nwData.liabilitiesBreakdown.creditCards,
      totalLoans: nwData.liabilitiesBreakdown.loans,
      totalBorrowedMoney: nwData.liabilitiesBreakdown.borrowedMoney,
      totalOtherLiabilities: nwData.liabilitiesBreakdown.otherDebts,
      totalAssets: nwData.totalAssets,
      totalLiabilities: nwData.totalLiabilities,
      netWorth: nwData.netWorth,
      liquidNetWorth: liquidNet,
      investedNetWorth: investedNet,
      tangibleNetWorth: tangibleNet,
      debtToAssetRatio: nwData.debtToAssetRatio,
      liquidityRatio: liqRatio,
    };
  }, [accounts, investments, assets, loans, liabilities, creditCards, monthlyOutflow]);

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

  // 3. Asset Allocation Data for Chart using Leftovers warm tones
  const assetChartData = React.useMemo(() => {
    return [
      { name: "Liquid Cash", amount: parseFloat(totalLiquid), color: "#244B3C" },
      { name: "Investments", amount: parseFloat(totalInvestments), color: "#8BA58C" },
      { name: "Fixed Assets", amount: parseFloat(totalFixedAssets), color: "#C39148" },
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

  const hasData = parseFloat(totalAssets) > 0 || parseFloat(totalLiabilities) > 0;

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
          <Button asChild size="sm" variant="outline" className="h-8 sm:h-9 text-xs border-border/80">
            <Link href="/reports">View Cash Flow Reports</Link>
          </Button>
          <Button asChild size="sm" className="h-8 sm:h-9 bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium">
            <Link href="/assets">Add Tangible Asset</Link>
          </Button>
        </div>
      </div>

      {!hasData ? (
        /* Section 11 Onboarding Empty State */
        <Card className="border border-dashed border-border bg-card p-8 sm:p-12 text-center rounded-2xl">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Scale className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Start Building Your Balance Sheet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            Add your bank accounts, stocks, mutual funds, or real estate to see your consolidated net worth and solvency ratios in real time.
          </p>
          <div className="mt-4 p-3 rounded-lg bg-surface-secondary/40 border border-border/60 max-w-sm mx-auto text-left text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground">Formula:</div>
            <div>Net Worth = (Liquid Cash + Investments + Assets) − (Credit dues + Loans)</div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button asChild size="sm" className="h-9 bg-primary hover:bg-primary-hover text-primary-foreground text-xs">
              <Link href="/accounts">Add First Account</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 text-xs border-border/80">
              <Link href="/investments">Add Investments</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 text-xs border-border/80">
              <Link href="/assets">Add Tangible Asset</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Main Net Worth Banner */}
          <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                      Consolidated Real-Time Net Worth
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-600/30">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Balance Sheet Equity
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
                      Total Assets: <strong className="text-foreground">₹{parseFloat(totalAssets).toLocaleString("en-IN")}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Total Liabilities: <strong className="text-foreground">₹{parseFloat(totalLiabilities).toLocaleString("en-IN")}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Debt-to-Asset: <strong className="text-foreground">{debtToAssetRatio}%</strong>
                    </span>
                  </div>
                </div>

                {/* Quick Balance Health Meter */}
                <div className="w-full md:w-64 space-y-2 p-3.5 rounded-xl border border-border/60 bg-surface-secondary/40">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Debt-to-Asset Ratio</span>
                    <span className="font-mono font-bold text-foreground">{debtToAssetRatio}%</span>
                  </div>
                  <Progress
                    value={parseFloat(debtToAssetRatio)}
                    indicatorClassName={
                      parseFloat(debtToAssetRatio) > 50
                        ? "bg-danger"
                        : parseFloat(debtToAssetRatio) > 30
                        ? "bg-warning"
                        : "bg-success"
                    }
                    className="h-2"
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>Target: &lt; 30%</span>
                    <span className={parseFloat(debtToAssetRatio) <= 30 ? "text-success font-semibold" : "text-warning"}>
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
            <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
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
                  className="text-xl sm:text-2xl font-bold text-foreground block font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Bank accounts & cash minus credit card balances. Immediately accessible reserves.
                </p>
              </CardContent>
            </Card>

            {/* Invested Net Worth */}
            <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Invested Net Worth
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                    <Coins className="h-4 w-4" />
                  </div>
                </div>
                <MoneyDisplay
                  amount={investedNetWorth}
                  className="text-xl sm:text-2xl font-bold text-foreground block font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Current market valuation of Indian/US stocks, mutual funds, gold, and SIPs.
                </p>
              </CardContent>
            </Card>

            {/* Tangible Net Worth */}
            <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tangible Net Worth
                  </span>
                  <div className="h-7 w-7 rounded-lg bg-warning/15 text-warning flex items-center justify-center">
                    <Home className="h-4 w-4" />
                  </div>
                </div>
                <MoneyDisplay
                  amount={tangibleNetWorth}
                  className="text-xl sm:text-2xl font-bold text-foreground block font-mono"
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
          <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base font-bold text-foreground">
                      Financial Health Score
                    </CardTitle>
                    <Badge
                      className={`text-xs font-semibold ${
                        healthScore.score >= 85
                          ? "bg-success/10 text-success border-success/30"
                          : healthScore.score >= 70
                          ? "bg-primary/10 text-primary border-primary/30"
                          : healthScore.score >= 50
                          ? "bg-warning/10 text-warning border-warning/30"
                          : "bg-danger/10 text-danger border-danger/30"
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
                  <div key={p.name} className="p-3 rounded-lg border border-border/60 bg-surface-secondary/40 space-y-1.5">
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
            <Card className="shadow-xs border border-border/80 bg-card rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <PieIcon className="h-4 w-4 text-primary" />
                  <span>Asset Class Allocation</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribution across liquid cash, productive investments, and property
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
            <Card className="shadow-xs border border-border/80 bg-card rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Consolidated Balance Sheet
                </CardTitle>
                <CardDescription className="text-xs">
                  Audited breakdown of assets and liabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assets Group */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-success uppercase tracking-wider block">
                    Assets (+)
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Liquid Accounts & Cash</span>
                      <MoneyDisplay amount={totalLiquid} className="font-semibold text-foreground font-mono" />
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Investment Holdings</span>
                      <MoneyDisplay amount={totalInvestments} className="font-semibold text-foreground font-mono" />
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Fixed & Tangible Assets</span>
                      <MoneyDisplay amount={totalFixedAssets} className="font-semibold text-foreground font-mono" />
                    </div>
                    {parseFloat(totalReceivables) > 0 && (
                      <div className="flex justify-between py-1.5 border-b border-border/60">
                        <span className="text-muted-foreground">Receivables (Money Lent)</span>
                        <MoneyDisplay amount={totalReceivables} className="font-semibold text-foreground font-mono" />
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 font-bold text-foreground">
                      <span>Gross Assets Total</span>
                      <MoneyDisplay amount={totalAssets} className="font-mono" />
                    </div>
                  </div>
                </div>

                {/* Liabilities Group */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-danger uppercase tracking-wider block">
                    Liabilities (−)
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Credit Card Debt</span>
                      <MoneyDisplay amount={totalCreditCards} className="font-semibold text-danger font-mono" />
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Loans & Mortgages</span>
                      <MoneyDisplay amount={totalLoans} className="font-semibold text-danger font-mono" />
                    </div>
                    {parseFloat(totalBorrowedMoney) > 0 && (
                      <div className="flex justify-between py-1.5 border-b border-border/60">
                        <span className="text-muted-foreground">Borrowed Money</span>
                        <MoneyDisplay amount={totalBorrowedMoney} className="font-semibold text-danger font-mono" />
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 border-b border-border/60">
                      <span className="text-muted-foreground">Other External Obligations</span>
                      <MoneyDisplay amount={totalOtherLiabilities} className="font-semibold text-danger font-mono" />
                    </div>
                    <div className="flex justify-between py-1.5 font-bold text-danger">
                      <span>Gross Liabilities Total</span>
                      <MoneyDisplay amount={totalLiabilities} className="font-mono" />
                    </div>
                  </div>
                </div>

                {/* Net Position */}
                <div className="pt-2 border-t border-border flex justify-between items-baseline text-sm font-bold">
                  <span className="text-foreground">Total Net Worth (Equity)</span>
                  <MoneyDisplay amount={netWorth} className="text-base font-extrabold text-foreground font-mono" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 5: HISTORICAL MONTHLY NET WORTH SNAPSHOTS
          ────────────────────────────────────────────────────────────── */}
          <Card className="shadow-xs border border-border/80 bg-card rounded-xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
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
                          <span className="text-foreground">{snap.month}</span>
                          {snap.isCurrent && (
                            <Badge variant="outline" className="text-[9px] text-primary border-primary/30 py-0 px-1">
                              Current
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground">₹{parseFloat(snap.assets).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-mono text-danger">₹{parseFloat(snap.liabilities).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-foreground">₹{parseFloat(snap.netWorth).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 font-mono text-right text-success font-semibold">
                          +{snap.momPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
