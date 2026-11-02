"use client";

import * as React from "react";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingDown,
  TrendingUp,
  Percent,
  Receipt,
  PiggyBank,
  Printer,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from "lucide-react";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from "date-fns";
import dynamic from "next/dynamic";

const CashFlowChart = dynamic(
  () => import("./cash-flow-chart").then((mod) => mod.CashFlowChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse bg-surface-secondary/40 rounded-2xl flex items-center justify-center text-xs text-text-secondary">
        Loading cash flow analytics...
      </div>
    ),
  }
);

const CategoryPieChart = dynamic(
  () => import("./category-pie-chart").then((mod) => mod.CategoryPieChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse bg-surface-secondary/40 rounded-2xl flex items-center justify-center text-xs text-text-secondary">
        Loading category breakdown...
      </div>
    ),
  }
);

import { DailySpendingScrubber } from "./daily-spending-scrubber";
import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricCard } from "@/components/financial/metric-card";
import { MoneyDisplay } from "@/components/financial/money-display";
import {
  addMoney,
  subtractMoney,
  calculateSavingsRate,
  getIndianFinancialYearInterval,
  generateDeterministicInsights,
} from "@/lib/calculations/financial";

interface ReportsViewProps {
  transactions: any[];
  accounts: Tables<"accounts">[];
  categories: Tables<"categories">[];
}

export function ReportsView({
  transactions,
  accounts,
  categories,
}: ReportsViewProps) {
  const [period, setPeriod] = React.useState<string>("last_6_months");
  const [activeTab, setActiveTab] = React.useState<"scrubber" | "trends">("scrubber");

  // Filter transactions according to selected period
  const { filteredTransactions, activePeriodLabel } = React.useMemo(() => {
    const now = new Date();

    if (period === "this_month") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        filteredTransactions: transactions.filter((t) =>
          isWithinInterval(new Date(t.transaction_date), { start, end })
        ),
        activePeriodLabel: `${format(start, "MMM yyyy")}`,
      };
    }

    if (period === "last_month") {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      return {
        filteredTransactions: transactions.filter((t) =>
          isWithinInterval(new Date(t.transaction_date), { start, end })
        ),
        activePeriodLabel: `${format(start, "MMM yyyy")}`,
      };
    }

    if (period === "last_6_months") {
      const start = startOfMonth(subMonths(now, 5));
      const end = endOfMonth(now);
      return {
        filteredTransactions: transactions.filter((t) =>
          isWithinInterval(new Date(t.transaction_date), { start, end })
        ),
        activePeriodLabel: `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`,
      };
    }

    if (period === "current_fy") {
      const { start, end, label } = getIndianFinancialYearInterval(now, 0);
      return {
        filteredTransactions: transactions.filter((t) =>
          isWithinInterval(new Date(t.transaction_date), { start, end })
        ),
        activePeriodLabel: `${label} (01 Apr ${start.getFullYear()} – 31 Mar ${end.getFullYear()})`,
      };
    }

    if (period === "previous_fy") {
      const { start, end, label } = getIndianFinancialYearInterval(now, -1);
      return {
        filteredTransactions: transactions.filter((t) =>
          isWithinInterval(new Date(t.transaction_date), { start, end })
        ),
        activePeriodLabel: `${label} (01 Apr ${start.getFullYear()} – 31 Mar ${end.getFullYear()})`,
      };
    }

    if (period === "calendar_year") {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return {
        filteredTransactions: transactions.filter((t) =>
          isWithinInterval(new Date(t.transaction_date), { start, end })
        ),
        activePeriodLabel: `CY ${now.getFullYear()} (Jan – Dec)`,
      };
    }

    return {
      filteredTransactions: transactions,
      activePeriodLabel: "All Time (Complete History)",
    };
  }, [transactions, period]);

  // Total Liquid Capital
  const totalLiquid = React.useMemo(() => {
    let sum = "0.0000";
    for (const a of accounts) {
      if (
        !a.is_archived &&
        ["bank", "checking", "savings", "cash", "wallet"].includes(a.account_type || "")
      ) {
        sum = addMoney(sum, a.current_balance);
      }
    }
    return sum;
  }, [accounts]);

  // Deterministic Financial Insights
  const insightsData = React.useMemo(() => {
    return generateDeterministicInsights(filteredTransactions, totalLiquid);
  }, [filteredTransactions, totalLiquid]);

  // Aggregate Metrics
  const { totalIncome, totalExpenses, netSavings, savingsRate } = React.useMemo(() => {
    let income = "0.0000";
    let expense = "0.0000";

    for (const t of filteredTransactions) {
      if (t.transaction_type === "income" || t.transaction_type === "refund") {
        income = addMoney(income, t.amount);
      } else if (t.transaction_type === "expense") {
        expense = addMoney(expense, t.amount);
      }
    }

    const { netSavings, savingsRatePercent } = calculateSavingsRate(income, expense);
    return {
      totalIncome: income,
      totalExpenses: expense,
      netSavings,
      savingsRate: savingsRatePercent,
    };
  }, [filteredTransactions]);

  // Monthly Cash Flow Chart Data
  const cashFlowChartData = React.useMemo(() => {
    const monthlyMap: Record<
      string,
      { month: string; income: number; expense: number; net: number }
    > = {};

    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "MMM yyyy");
      monthlyMap[key] = { month: key, income: 0, expense: 0, net: 0 };
    }

    for (const t of transactions) {
      const key = format(new Date(t.transaction_date), "MMM yyyy");
      if (monthlyMap[key]) {
        const amt = parseFloat(t.amount);
        if (t.transaction_type === "income" || t.transaction_type === "refund") {
          monthlyMap[key].income += amt;
          monthlyMap[key].net += amt;
        } else if (t.transaction_type === "expense") {
          monthlyMap[key].expense += amt;
          monthlyMap[key].net -= amt;
        }
      }
    }

    return Object.values(monthlyMap);
  }, [transactions]);

  // Category Expense Distribution Chart Data
  const categoryChartData = React.useMemo(() => {
    const catMap: Record<string, { name: string; amount: number; color: string }> = {};

    for (const t of filteredTransactions) {
      if (t.transaction_type === "expense") {
        const name = t.category?.name || "Uncategorized";
        const color = t.category?.color || "#8BA58C";
        const amt = parseFloat(t.amount);

        if (!catMap[name]) {
          catMap[name] = { name, amount: 0, color };
        }
        catMap[name].amount += amt;
      }
    }

    return Object.values(catMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredTransactions]);

  // JSON Export (Full Ledger Audit Format)
  const handleExportJSON = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions to export for the selected period.");
      return;
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      period: activePeriodLabel,
      metrics: {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate: `${savingsRate}%`,
        liquidRunway: `${insightsData.liquidRunwayMonths} months`,
      },
      transactions: filteredTransactions.map((t) => ({
        id: t.id,
        date: t.transaction_date,
        type: t.transaction_type,
        amount: t.amount,
        currency: t.currency,
        account: t.account?.name || null,
        category: t.category?.name || "Uncategorized",
        subcategory: t.subcategory?.name || null,
        description: t.description || null,
        referenceNumber: t.reference_number || null,
      })),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `wealthovers_financial_report_${format(new Date(), "yyyyMMdd")}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("No transactions to export for the selected period.");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Account",
      "Category",
      "Subcategory",
      "Amount",
      "Currency",
      "Description",
      "Reference",
    ];

    const rows = filteredTransactions.map((t) => [
      format(new Date(t.transaction_date), "yyyy-MM-dd"),
      t.transaction_type,
      `"${t.account?.name || ""}"`,
      `"${t.category?.name || "Uncategorized"}"`,
      `"${t.subcategory?.name || ""}"`,
      t.amount,
      t.currency,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      `"${t.reference_number || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `wealthovers_transactions_${format(new Date(), "yyyyMMdd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              Insights & Analytics
            </h2>
            <Badge variant="outline" className="text-xs font-normal border-primary/30 text-primary bg-primary/10 rounded-lg">
              {activePeriodLabel}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Interactive day scrubber, deterministic cash flow trends, and category distribution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48 h-9 text-xs bg-surface border-border rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface text-text-primary border-border">
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="current_fy">Current FY (Apr–Mar)</SelectItem>
              <SelectItem value="previous_fy">Previous FY (Apr–Mar)</SelectItem>
              <SelectItem value="calendar_year">Calendar Year (CY)</SelectItem>
              <SelectItem value="all">All Time History</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 h-9 text-xs rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary"
            title="Download CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="gap-1.5 h-9 text-xs rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary"
            title="Download JSON Ledger"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 h-9 text-xs rounded-xl border-border bg-surface text-text-secondary hover:text-text-primary"
            title="Print or Save as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Primary Insights Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-secondary/70 rounded-xl border border-border/70 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("scrubber")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "scrubber"
              ? "bg-primary text-surface shadow-2xs"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Daily Scrubber & Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("trends")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "trends"
              ? "bg-primary text-surface shadow-2xs"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Monthly Cash Flow & Distribution</span>
        </button>
      </div>

      {/* Tab 1: Daily Spending Scrubber */}
      {activeTab === "scrubber" && (
        <div className="space-y-6">
          <DailySpendingScrubber transactions={transactions} />
        </div>
      )}

      {/* Tab 2: Monthly Cash Flow & Distribution */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Inflow"
              amount={totalIncome}
              subtitle="Earnings & credits"
              icon={TrendingUp}
              iconColor="emerald"
              coloredAmount
            />
            <MetricCard
              title="Total Outflow"
              amount={totalExpenses}
              subtitle="Expenses & debits"
              icon={TrendingDown}
              iconColor="coral"
              coloredAmount={false}
            />
            <MetricCard
              title="Net Savings"
              amount={netSavings}
              subtitle="Retained capital"
              icon={PiggyBank}
              iconColor="forest"
              coloredAmount
            />
            <MetricCard
              title="Savings Rate"
              amount={`${savingsRate}%`}
              formatType="percent"
              subtitle="Proportion of income saved"
              icon={Percent}
              iconColor="indigo"
            />
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Cash Flow Chart */}
            <Card className="rounded-2xl border border-border/80 bg-surface shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold text-text-primary">
                  Monthly Cash Flow (Last 6 Months)
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary">
                  Comparison of total inflows vs total outflows over time
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <CashFlowChart data={cashFlowChartData} />
              </CardContent>
            </Card>

            {/* Category Breakdown Chart */}
            <Card className="rounded-2xl border border-border/80 bg-surface shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold text-text-primary">
                  Top Expense Categories
                </CardTitle>
                <CardDescription className="text-xs text-text-secondary">
                  Spending allocation across major expense categories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {categoryChartData.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center text-text-secondary">
                    <Receipt className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-xs font-semibold text-text-primary">No expenses recorded for this period</p>
                  </div>
                ) : (
                  <CategoryPieChart data={categoryChartData} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Deterministic Financial Intelligence Strip */}
      <Card className="border border-border/80 shadow-2xs rounded-2xl overflow-hidden bg-surface">
        <CardHeader className="p-4 pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm sm:text-base font-bold text-text-primary">
                Financial Insights & Anomaly Intelligence
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-mono font-medium rounded-lg ${
                  insightsData.anomaliesCount === 0
                    ? "border-success/30 text-success bg-success/10"
                    : "border-warning/30 text-warning bg-warning/10"
                }`}
              >
                {insightsData.anomaliesCount === 0
                  ? "Zero Anomalies Detected"
                  : `${insightsData.anomaliesCount} Anomaly Flagged`}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono rounded-lg bg-surface-secondary text-text-secondary">
                Runway: {insightsData.liquidRunwayMonths} mo
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Telemetry Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-surface-secondary/40 text-xs border border-border/60">
            <div>
              <span className="text-text-secondary block text-[11px]">Emergency Runway</span>
              <span className="font-bold text-text-primary text-sm">
                {insightsData.liquidRunwayMonths} months
              </span>
            </div>
            <div>
              <span className="text-text-secondary block text-[11px]">Primary Expense Driver</span>
              <span className="font-bold text-text-primary text-sm">
                {insightsData.topExpenseCategory
                  ? `${insightsData.topExpenseCategory.name} (${insightsData.topExpenseCategory.percentage}%)`
                  : "None recorded"}
              </span>
            </div>
            <div>
              <span className="text-text-secondary block text-[11px]">Largest Single Outflow</span>
              <span className="font-bold text-text-primary text-sm truncate block" title={insightsData.highestTransaction?.description}>
                {insightsData.highestTransaction
                  ? `${insightsData.highestTransaction.description} (₹${parseFloat(insightsData.highestTransaction.amount).toFixed(0)})`
                  : "None recorded"}
              </span>
            </div>
          </div>

          {/* Actionable Insights List */}
          {insightsData.insights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insightsData.insights.map((item) => {
                const isPositive = item.type === "positive";
                const isAlert = item.type === "alert";
                const isWarning = item.type === "warning";

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      isPositive
                        ? "border-success/20 bg-success/5"
                        : isAlert
                        ? "border-danger/20 bg-danger/5"
                        : isWarning
                        ? "border-warning/20 bg-warning/5"
                        : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isPositive && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {isAlert && <AlertTriangle className="h-4 w-4 text-danger" />}
                      {isWarning && <AlertTriangle className="h-4 w-4 text-warning" />}
                      {item.type === "neutral" && <ShieldCheck className="h-4 w-4 text-primary" />}
                    </div>

                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-text-primary truncate">
                          {item.title}
                        </span>
                        {item.metric && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono font-medium shrink-0">
                            {item.metric}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-text-secondary text-center py-2">
              Record more income and expenses in this period to unlock detailed deterministic insights.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
