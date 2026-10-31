"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Landmark,
  CreditCard,
  Scale,
  Home,
  Coins,
  ShieldCheck,
  ChevronRight,
  PieChart as PieIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { Tables } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MoneyDisplay } from "@/components/financial/money-display";
import { MetricCard } from "@/components/financial/metric-card";
import {
  addMoney,
  subtractMoney,
  calculateNetWorth,
  calculateInvestmentReturns,
  DEFAULT_USD_INR_RATE,
} from "@/lib/calculations/financial";

interface NetWorthViewProps {
  accounts: Tables<"accounts">[];
  investments: Tables<"investments">[];
  assets: Tables<"assets">[];
  loans: Tables<"loans">[];
  liabilities: Tables<"liabilities">[];
}

const ASSET_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899"];

export function NetWorthView({
  accounts,
  investments,
  assets,
  loans,
  liabilities,
}: NetWorthViewProps) {
  const {
    totalLiquid,
    totalInvestments,
    totalFixedAssets,
    totalCreditCards,
    totalLoans,
    totalOtherLiabilities,
    totalGrossAssets,
    totalGrossLiabilities,
    netWorth,
  } = React.useMemo(() => {
    // 1. Liquid Accounts vs Credit Card balances
    let liquid = "0.0000";
    let ccDebt = "0.0000";

    for (const a of accounts.filter((acc) => !acc.is_archived)) {
      if (a.account_type === "credit_card") {
        ccDebt = addMoney(ccDebt, a.current_balance);
      } else if (a.account_type === "loan_account") {
        // handled in loans or accounts
      } else {
        liquid = addMoney(liquid, a.current_balance);
      }
    }

    // 2. Investments (with USD converted to INR)
    let inv = "0.0000";
    for (const i of investments) {
      const returns = calculateInvestmentReturns(
        i.total_quantity,
        i.average_buy_price,
        i.current_nav_or_price,
        i.currency,
        DEFAULT_USD_INR_RATE
      );
      inv = addMoney(inv, returns.currentValuation);
    }

    // 3. Fixed Assets
    let ast = "0.0000";
    for (const a of assets) {
      ast = addMoney(ast, a.current_valuation);
    }

    // 4. Loans
    let ln = "0.0000";
    for (const l of loans) {
      ln = addMoney(ln, l.outstanding_balance);
    }

    // 5. External Liabilities
    let lia = "0.0000";
    for (const l of liabilities) {
      lia = addMoney(lia, l.outstanding_amount);
    }

    const grossAssets = addMoney(addMoney(liquid, inv), ast);
    const grossLiabilities = addMoney(addMoney(ccDebt, ln), lia);
    const nw = subtractMoney(grossAssets, grossLiabilities);

    return {
      totalLiquid: liquid,
      totalInvestments: inv,
      totalFixedAssets: ast,
      totalCreditCards: ccDebt,
      totalLoans: ln,
      totalOtherLiabilities: lia,
      totalGrossAssets: grossAssets,
      totalGrossLiabilities: grossLiabilities,
      netWorth: nw,
    };
  }, [accounts, investments, assets, loans, liabilities]);

  // Asset Distribution Data for Recharts
  const assetChartData = React.useMemo(() => {
    const list = [
      { name: "Bank & Cash", amount: parseFloat(totalLiquid), color: "#3B82F6" },
      { name: "Investments", amount: parseFloat(totalInvestments), color: "#10B981" },
      { name: "Fixed Assets", amount: parseFloat(totalFixedAssets), color: "#8B5CF6" },
    ].filter((item) => item.amount > 0);
    return list;
  }, [totalLiquid, totalInvestments, totalFixedAssets]);

  // Debt Ratio
  const debtToAssetRatio = React.useMemo(() => {
    const a = parseFloat(totalGrossAssets);
    const l = parseFloat(totalGrossLiabilities);
    if (a <= 0) return 0;
    return Math.min(Math.round((l / a) * 100), 100);
  }, [totalGrossAssets, totalGrossLiabilities]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Net Worth Statement</h2>
          <p className="text-sm text-muted-foreground">
            Complete multi-asset consolidation across liquid, equity, real estate, and debt obligations.
          </p>
        </div>
      </div>

      {/* Main Net Worth Banner */}
      <Card className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-primary/20 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Consolidated Real-Time Net Worth
              </span>
              <div className="mt-1">
                <MoneyDisplay
                  amount={netWorth}
                  className="text-3xl md:text-4xl font-extrabold text-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total Assets: ₹{parseFloat(totalGrossAssets).toLocaleString()} • Total Debt: ₹{parseFloat(totalGrossLiabilities).toLocaleString()}
              </p>
            </div>

            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Debt-to-Asset Ratio</span>
                <span className="font-mono font-bold">{debtToAssetRatio}%</span>
              </div>
              <Progress
                value={debtToAssetRatio}
                indicatorClassName={
                  debtToAssetRatio > 50
                    ? "bg-rose-500"
                    : debtToAssetRatio > 30
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }
                className="h-2"
              />
              <span className="text-[11px] text-muted-foreground block text-right">
                {debtToAssetRatio <= 30 ? "Strong balance sheet" : "High leverage"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets & Liabilities Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Liquid Capital"
          amount={totalLiquid}
          subtitle="Savings & cash reserves"
          icon={Landmark}
          iconColor="#3B82F6"
        />
        <MetricCard
          title="Investments"
          amount={totalInvestments}
          subtitle="Stocks, Mutual Funds, Gold"
          icon={Coins}
          iconColor="#10B981"
        />
        <MetricCard
          title="Fixed Assets"
          amount={totalFixedAssets}
          subtitle="Real estate & tangible assets"
          icon={Home}
          iconColor="#8B5CF6"
        />
        <MetricCard
          title="Total Obligations"
          amount={totalGrossLiabilities}
          subtitle="Credit cards, loans & debts"
          icon={Scale}
          iconColor="#EF4444"
          coloredAmount={false}
        />
      </div>

      {/* Asset Distribution Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts Donut */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Asset Class Allocation
            </CardTitle>
            <CardDescription>
              Distribution of capital across liquid, investments, and physical assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                No asset holdings recorded
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetChartData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={3}
                    >
                      {assetChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [
                        `₹${parseFloat(val).toLocaleString("en-IN")}`,
                        "Valuation",
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Sheet Breakdown Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Consolidated Balance Sheet
            </CardTitle>
            <CardDescription>
              Detailed breakdown of asset classes and liabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Assets Group */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                Assets (+)
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Liquid Accounts & Cash</span>
                  <MoneyDisplay amount={totalLiquid} className="font-semibold" />
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Investment Holdings</span>
                  <MoneyDisplay amount={totalInvestments} className="font-semibold" />
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Fixed & Tangible Assets</span>
                  <MoneyDisplay amount={totalFixedAssets} className="font-semibold" />
                </div>
              </div>
            </div>

            {/* Liabilities Group */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
                Liabilities (−)
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Credit Card Outstanding</span>
                  <MoneyDisplay amount={totalCreditCards} className="font-semibold text-rose-600" />
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Loans & Mortgages</span>
                  <MoneyDisplay amount={totalLoans} className="font-semibold text-rose-600" />
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Other External Debts</span>
                  <MoneyDisplay amount={totalOtherLiabilities} className="font-semibold text-rose-600" />
                </div>
              </div>
            </div>

            {/* Net Position */}
            <div className="pt-2 border-t flex justify-between items-baseline text-sm font-bold">
              <span>Net Equity (Net Worth)</span>
              <MoneyDisplay amount={netWorth} className="text-base font-extrabold" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

