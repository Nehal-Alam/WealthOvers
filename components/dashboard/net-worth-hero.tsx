"use client";

import * as React from "react";
import Link from "next/link";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  ShieldCheck,
  Building,
  CreditCard,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { NetWorthBreakdown } from "@/lib/calculations/financial";

interface HomeNetWorthHeroProps {
  netWorthData: NetWorthBreakdown;
  totalInvested: string;
  investmentPnl: {
    profitOrLoss: string;
    isProfit: boolean;
    pnlPercent: string;
  };
  monthlyInflow: string;
  monthlyOutflow: string;
  netSavings: string;
  savingsRate: string;
  activeAccountCount: number;
  hasFinancialData: boolean;
}

export function HomeNetWorthHero({
  netWorthData,
  totalInvested,
  investmentPnl,
  monthlyInflow,
  monthlyOutflow,
  netSavings,
  savingsRate,
  activeAccountCount,
  hasFinancialData,
}: HomeNetWorthHeroProps) {
  if (!hasFinancialData) {
    return (
      <Card className="border border-dashed border-border bg-card p-6 sm:p-10 text-center rounded-2xl shadow-2xs">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
          <Scale className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Welcome to WealthOvers</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
          Connect your accounts, investments, or assets to calculate your consolidated net worth and start tracking your real-time financial balance sheet.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="sm" className="h-9 bg-primary hover:bg-primary-hover text-surface rounded-xl text-xs font-semibold">
            <Link href="/accounts">Add First Account</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-9 rounded-xl text-xs border-border/80">
            <Link href="/investments">Add Investments</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-9 rounded-xl text-xs border-border/80">
            <Link href="/net-worth">Explore Net Worth</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const isNetPositive = netWorthData.isNetPositive;
  const isSavingsPositive = parseFloat(netSavings) >= 0;

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 10.1: PROMINENT TOTAL NET WORTH HERO CARD
      ────────────────────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-surface to-surface-secondary/40 rounded-3xl shadow-xs">
        {/* Top Organic Forest Brand Accent Line */}
        <div className="h-1.5 w-full bg-primary" />

        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-primary" />
                  <span>Total Net Worth</span>
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isNetPositive
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-danger/10 text-danger border-danger/30"
                  }`}
                >
                  {isNetPositive ? "Positive Equity" : "Net Deficit"}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  (Assets − Liabilities)
                </span>
              </div>

              {/* Main Net Worth Value Display */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <MoneyDisplay
                  amount={netWorthData.netWorth}
                  className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-mono ${
                    isNetPositive ? "text-foreground" : "text-danger"
                  }`}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Consolidated balance sheet encompassing liquid capital, investment portfolios, tangible holdings, and liabilities.
              </p>
            </div>

            {/* Quick Link Action & Solvency Metric */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
              <Button
                asChild
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-surface rounded-xl shadow-xs text-xs font-semibold gap-1.5"
              >
                <Link href="/net-worth">
                  <span>View Net Worth Statement</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>

              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Debt-to-Asset:</span>
                <strong className="font-mono text-foreground font-semibold">
                  {netWorthData.debtToAssetRatio}%
                </strong>
                <span className="opacity-40">•</span>
                <span>Solvency:</span>
                <strong className="font-mono text-foreground font-semibold">
                  {netWorthData.solvencyRatio}x
                </strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 10.2: KEY FINANCIAL PILLARS GRID (5 CARDS)
          1. Total Account Balance
          2. Total Investments
          3. Total Assets
          4. Total Liabilities
          5. Monthly Financial Summary
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Account Balance */}
        <Card className="border border-border/80 bg-surface rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Account Balances
              </span>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5" />
              </div>
            </div>
            <MoneyDisplay
              amount={netWorthData.assetsBreakdown.liquidAccounts}
              className="text-lg sm:text-xl font-bold font-mono text-foreground block"
            />
            <p className="text-[11px] text-muted-foreground">
              {activeAccountCount} active {activeAccountCount === 1 ? "account" : "accounts"}
            </p>
          </div>
          <div className="pt-3 border-t border-border/60 mt-2">
            <Button asChild variant="ghost" size="sm" className="h-7 w-full text-xs text-primary hover:text-primary hover:bg-primary/10 justify-between p-0 font-medium">
              <Link href="/accounts">
                <span>View Accounts</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Card 2: Total Investments */}
        <Card className="border border-border/80 bg-surface rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Investments
              </span>
              <div className="h-7 w-7 rounded-lg bg-emerald/10 text-emerald flex items-center justify-center">
                <Coins className="h-3.5 w-3.5" />
              </div>
            </div>
            <MoneyDisplay
              amount={netWorthData.assetsBreakdown.investments}
              className="text-lg sm:text-xl font-bold font-mono text-foreground block"
            />
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-muted-foreground">P&L:</span>
              <span className={`font-semibold ${investmentPnl.isProfit ? "text-success" : "text-danger"}`}>
                {investmentPnl.isProfit ? "+" : ""}
                <MoneyDisplay amount={investmentPnl.profitOrLoss} className="font-mono" />
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-border/60 mt-2">
            <Button asChild variant="ghost" size="sm" className="h-7 w-full text-xs text-primary hover:text-primary hover:bg-primary/10 justify-between p-0 font-medium">
              <Link href="/investments">
                <span>View Portfolio</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Card 3: Total Assets */}
        <Card className="border border-border/80 bg-surface rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Assets
              </span>
              <div className="h-7 w-7 rounded-lg bg-success/10 text-success flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <MoneyDisplay
              amount={netWorthData.totalAssets}
              className="text-lg sm:text-xl font-bold font-mono text-foreground block"
            />
            <p className="text-[11px] text-muted-foreground">
              Cash, stocks, gold & assets
            </p>
          </div>
          <div className="pt-3 border-t border-border/60 mt-2">
            <Button asChild variant="ghost" size="sm" className="h-7 w-full text-xs text-primary hover:text-primary hover:bg-primary/10 justify-between p-0 font-medium">
              <Link href="/net-worth">
                <span>Asset Breakdown</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Card 4: Total Liabilities */}
        <Card className="border border-border/80 bg-surface rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Liabilities
              </span>
              <div className="h-7 w-7 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
                <TrendingDown className="h-3.5 w-3.5" />
              </div>
            </div>
            <MoneyDisplay
              amount={netWorthData.totalLiabilities}
              className="text-lg sm:text-xl font-bold font-mono text-danger block"
            />
            <p className="text-[11px] text-muted-foreground">
              Cards, loans & obligations
            </p>
          </div>
          <div className="pt-3 border-t border-border/60 mt-2">
            <Button asChild variant="ghost" size="sm" className="h-7 w-full text-xs text-danger hover:text-danger hover:bg-danger/10 justify-between p-0 font-medium">
              <Link href="/loans">
                <span>View Debts</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Card 5: Monthly Financial Summary */}
        <Card className="border border-border/80 bg-surface rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Monthly Cash Flow
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4.5 font-mono">
                {savingsRate}% saved
              </Badge>
            </div>
            <div className="text-xs space-y-1 font-mono">
              <div className="flex justify-between text-success">
                <span>In:</span>
                <MoneyDisplay amount={monthlyInflow} />
              </div>
              <div className="flex justify-between text-danger">
                <span>Out:</span>
                <MoneyDisplay amount={monthlyOutflow} />
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-border/60 mt-2 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Net Savings:</span>
            <span className={`font-mono font-bold ${isSavingsPositive ? "text-success" : "text-danger"}`}>
              {isSavingsPositive ? "+" : ""}
              <MoneyDisplay amount={netSavings} />
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

