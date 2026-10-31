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
} from "lucide-react";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
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
  toDecimal,
} from "@/lib/calculations/financial";

const CHART_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#14B8A6",
];

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

  // Filter transactions according to selected period
  const filteredTransactions = React.useMemo(() => {
    const now = new Date();

    if (period === "this_month") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return transactions.filter((t) =>
        isWithinInterval(new Date(t.transaction_date), { start, end })
      );
    }

    if (period === "last_month") {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      return transactions.filter((t) =>
        isWithinInterval(new Date(t.transaction_date), { start, end })
      );
    }

    if (period === "last_6_months") {
      const start = startOfMonth(subMonths(now, 5));
      const end = endOfMonth(now);
      return transactions.filter((t) =>
        isWithinInterval(new Date(t.transaction_date), { start, end })
      );
    }

    return transactions;
  }, [transactions, period]);

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

    // Initialize last 6 months buckets
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
        const color = t.category?.color || "#6B7280";
        const amt = parseFloat(t.amount);

        if (!catMap[name]) {
          catMap[name] = { name, amount: 0, color };
        }
        catMap[name].amount += amt;
      }
    }

    return Object.values(catMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [filteredTransactions]);

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
          <h2 className="text-xl font-bold tracking-tight">Financial Reports & Insights</h2>
          <p className="text-sm text-muted-foreground">
            Analyze cash flow, category spending distributions, and export data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 h-9"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inflow"
          amount={totalIncome}
          subtitle="Earnings & credits"
          icon={TrendingUp}
          iconColor="#10B981"
          coloredAmount
        />
        <MetricCard
          title="Total Outflow"
          amount={totalExpenses}
          subtitle="Expenses & debits"
          icon={TrendingDown}
          iconColor="#EF4444"
          coloredAmount={false}
        />
        <MetricCard
          title="Net Savings"
          amount={netSavings}
          subtitle="Retained capital"
          icon={PiggyBank}
          iconColor="#3B82F6"
          coloredAmount
        />
        <MetricCard
          title="Savings Rate"
          amount={`${savingsRate}%`}
          subtitle="Proportion of income saved"
          icon={Percent}
          iconColor="#8B5CF6"
        />
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Cash Flow Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Monthly Cash Flow (Last 6 Months)
            </CardTitle>
            <CardDescription>
              Comparison of total inflows vs total outflows over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cashFlowChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} />
                  <YAxis fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [
                      `₹${parseFloat(val).toLocaleString("en-IN")}`,
                      "",
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Top Expense Categories
            </CardTitle>
            <CardDescription>
              Spending allocation across major expense categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length === 0 ? (
              <div className="h-72 flex flex-col items-center justify-center text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No expenses recorded for this period</p>
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={3}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [
                        `₹${parseFloat(val).toLocaleString("en-IN")}`,
                        "Spent",
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

